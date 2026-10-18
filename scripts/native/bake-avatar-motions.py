"""Bake selected Quaternius CC0 clips into the existing world-axis USD skeleton.
No source weapons/combat clips, no runtime glTF decoder; 24 Hz local TRS samples.
Mesh bind positions MUST match convert-humanoid.py. CPU skinning verifies grounding.
"""
import base64, hashlib, json, pathlib
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'ios/MyPersonalNeo/Resources';CACHE=pathlib.Path('/tmp/neo-toon')
def rotation(q):
 x,y,z,w=q/np.linalg.norm(q)
 return np.array([[1-2*y*y-2*z*z,2*x*y-2*z*w,2*x*z+2*y*w],[2*x*y+2*z*w,1-2*x*x-2*z*z,2*y*z-2*x*w],[2*x*z-2*y*w,2*y*z+2*x*w,1-2*x*x-2*y*y]])
def quaternion(m):
 # Stable conversion, including exact 180-degree rotations.
 vals,vecs=np.linalg.eigh(np.array([[m[0,0]-m[1,1]-m[2,2],m[0,1]+m[1,0],m[0,2]+m[2,0],m[2,1]-m[1,2]],[m[0,1]+m[1,0],m[1,1]-m[0,0]-m[2,2],m[1,2]+m[2,1],m[0,2]-m[2,0]],[m[0,2]+m[2,0],m[1,2]+m[2,1],m[2,2]-m[0,0]-m[1,1],m[1,0]-m[0,1]],[m[2,1]-m[1,2],m[0,2]-m[2,0],m[1,0]-m[0,1],m.trace()]]))
 q=vecs[:,np.argmax(vals)];return q if q[3]>=0 else -q

def bake(name,height):
 path=CACHE/(name+'.gltf');g=json.loads(path.read_text());buffers=[base64.b64decode(b['uri'].split(',')[1]) for b in g['buffers']]
 def acc(i):
  a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];dt=np.dtype({5126:np.float32,5125:np.uint32,5123:np.uint16,5121:np.uint8}[a['componentType']]);n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
  return np.ndarray((a['count'],n),dtype=dt,buffer=buffers[v['buffer']],offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',dt.itemsize*n),dt.itemsize)).copy()
 parents={c:i for i,n in enumerate(g['nodes']) for c in n.get('children',[])}
 def matrix(i,values={}):
  n=g['nodes'][i]
  if 'matrix' in n:return np.array(n['matrix']).reshape(4,4,order='F')
  m=np.eye(4);m[:3,:3]=rotation(np.asarray(values.get((i,'rotation'),n.get('rotation',[0,0,0,1]))))@np.diag(values.get((i,'scale'),n.get('scale',[1,1,1])));m[:3,3]=values.get((i,'translation'),n.get('translation',[0,0,0]));return m
 def worlds(values):
  cache={}
  def one(i):
   if i not in cache:cache[i]=(one(parents[i]) if i in parents else np.eye(4))@matrix(i,values)
   return cache[i]
  return one
 base=worlds({});skin=g['skins'][0];old=skin['joints']
 def depth(j):return 1+depth(parents[j]) if j in parents else 0
 joints=sorted(old,key=depth);lookup={j:i for i,j in enumerate(joints)};remap=np.array([lookup[j] for j in old])
 def jointpath(j):
  import re
  return (jointpath(parents[j])+'/' if parents.get(j) in lookup else '')+re.sub('[^a-zA-Z0-9_]','_',g['nodes'][j]['name'])
 paths=[jointpath(j) for j in joints];parts=[];jix=[];weights=[]
 for i,n in enumerate(g['nodes']):
  if 'skin' not in n or 'mesh' not in n or any(x in n.get('name','').lower() for x in ['weapon','pistol','sword']):continue
  for p in g['meshes'][n['mesh']]['primitives']:
   a=p['attributes'];v=acc(a['POSITION']);parts.append((i,(base(i)@np.c_[v,np.ones(len(v))].T).T[:,:3]));jix.extend(remap[acc(a['JOINTS_0']).astype(int)]);w=acc(a['WEIGHTS_0']);weights.extend(w/w.sum(1)[:,None])
 points=np.concatenate([p for _,p in parts]);lo=points.min(0);hi=points.max(0);scale=height/(hi[1]-lo[1]);N=np.eye(4);N[:3,:3]*=scale;N[:3,3]=-np.array([(lo[0]+hi[0])/2,lo[1],(lo[2]+hi[2])/2])*scale
 mesh=base(parts[0][0]);ibm=acc(skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1);sourceBind={j:mesh@np.linalg.inv(ibm[i]) for i,j in enumerate(old)}
 B=[]
 for j in joints:
  b=np.eye(4);b[:3,3]=(N@sourceBind[j])[:3,3];B.append(b)
 B=np.array(B);invB=np.linalg.inv(B);C={j:np.linalg.inv(N@sourceBind[j])@B[i] for i,j in enumerate(joints)}
 # New global pose = N * original animated joint * C. Skin deformations remain identical.
 pts=(N@np.c_[points,np.ones(len(points))].T).T;ji=np.array(jix);w=np.array(weights)
 soleNames=['Foot_L','Foot_R'] if name!='NeoDog' else ['FrontFoot_L','FrontFoot_R','BackFoot_L','BackFoot_R']
 footIds=[i for i,p in enumerate(paths) if any(s in p.split('/') for s in soleNames)]
 footMask=(np.isin(ji,footIds)*w).sum(1)>.5
 if not footMask.any():footMask=pts[:,1]<height*.12
 animations={a['name']:a for a in g['animations']};selected={'idle':'Idle_Neutral' if name!='NeoDog' else 'Idle','walk':'Walk','wave':'Wave' if name!='NeoDog' else 'Idle_2','interact':'Interact' if name!='NeoDog' else 'Idle_2'}
 clips={};report=[];walkSpeed=None
 for target,source in selected.items():
  a=animations[source];channels=[]
  for ch in a['channels']:
   s=a['samplers'][ch['sampler']];assert s.get('interpolation','LINEAR') in ('LINEAR','STEP')
   channels.append((ch['target']['node'],ch['target']['path'],acc(s['input']).flatten(),acc(s['output']),s.get('interpolation','LINEAR')))
  duration=float(max(c[2][-1] for c in channels));count=max(2,round(duration*24)+1);frames=[];reference=None;groundErrors=[];maxExtent=0;walkPositions=[]
  for t in np.linspace(0,duration,count):
   values={}
   for node,prop,times,samples,interpolation in channels:
    idx=min(len(times)-2,max(0,int(np.searchsorted(times,t,side='right')-1)));u=float(np.clip((t-times[idx])/max(1e-8,times[idx+1]-times[idx]),0,1)) if interpolation!='STEP' else 0
    aa=samples[idx].astype(float);bb=samples[idx+1].astype(float)
    if prop=='rotation' and np.dot(aa,bb)<0:bb=-bb
    value=aa*(1-u)+bb*u
    if prop=='rotation':value/=np.linalg.norm(value)
    values[(node,prop)]=value
   wm=worlds(values);P=np.array([N@wm(j)@C[j] for j in joints])
   if reference is None:reference=P[0,:3,3].copy()
   horizontal=P[0,:3,3]-reference;horizontal[1]=0;P[:,:3,3]-=horizontal
   deformed=(np.einsum('nkij,nj->nki',(P@invB)[ji],pts)[:,:,:3]*w[:,:,None]).sum(1)
   ground=float(deformed[footMask,1].min());P[:,1,3]-=ground;deformed[:,1]-=ground
   assert np.isfinite(deformed).all();assert deformed[:,1].max()<height*1.2
   assert deformed[:,1].min()>-.035
   maxExtent=max(maxExtent,float(np.ptp(deformed,axis=0).max()));groundErrors.append(float(deformed[footMask,1].min()))
   if target=='walk':
    footNames=['Foot_L','Foot_R'] if name!='NeoDog' else ['IKFrontLeg_L','IKFrontLeg_R','IKBackLeg_L','IKBackLeg_R']
    walkPositions.append([P[i,:3,3].copy() for i,p in enumerate(paths) if p.split('/')[-1] in footNames])
   packed=[]
   for j,p in zip(joints,P):
    local=np.linalg.inv(P[lookup[parents[j]]])@p if parents.get(j) in lookup else p
    assert np.allclose(local[:3,:3].T@local[:3,:3],np.eye(3),atol=3e-4), 'Runtime motion must be rigid, never skew a joint'
    q=quaternion(local[:3,:3]);assert np.allclose(rotation(q),local[:3,:3],atol=3e-4)
    packed.extend(np.round(np.r_[local[:3,3],q],6).tolist())
   frames.append(packed)
  if target=='walk':
   samples=np.array(walkPositions);dt=duration/(count-1);speeds=[]
   for j in range(samples.shape[1]):
    y=samples[:,j,1];stance=y<y.min()+.035;v=-np.diff(samples[:,j,2])/dt
    speeds.extend(v[stance[1:]&stance[:-1]&(v>.05)])
   walkSpeed=float(np.median(speeds));assert .1<walkSpeed<3
  clips[target]={'duration':round(duration,6),'frames':frames}
  report.append({'clip':target,'source':source,'frames':count,'seconds':duration,'maxExtentMeters':maxExtent,'maxSoleGroundErrorMeters':max(abs(x) for x in groundErrors)})
 bindRest=[np.linalg.inv(B[lookup[parents[j]]])@b if parents.get(j) in lookup else b for j,b in zip(joints,B)]
 output=OUT/(name+'.motion.json');output.write_text(json.dumps({'version':1,'walkSpeed':round(walkSpeed,6),'joints':paths,'bindTranslations':np.round(np.array([r[:3,3] for r in bindRest]),6).flatten().tolist(),'clips':clips},separators=(',',':'))+'\n')
 return {'asset':name,'nominalWalkSpeedMetersPerSecond':walkSpeed,'author':'Quaternius','license':'CC0-1.0','sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'motionFile':output.name,'bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'clips':report}
report=[bake(*s) for s in [('NeoMan',1.72),('NeoWoman',1.66),('NeoDog',.6)]]
(OUT/'MotionManifest.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
