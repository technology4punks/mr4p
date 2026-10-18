"""Reproducible glTF -> USD Skel conversion, no DCC/editor or manual modelling.
Requires usd-core==26.8 numpy==2.5.4; reads the already-attributed local GLB.
"""
import json, struct, pathlib, hashlib, tempfile
import numpy as np
from pxr import Usd, UsdGeom, UsdShade, UsdSkel, UsdUtils, Sdf, Gf, Vt
root=pathlib.Path(__file__).resolve().parents[2]
source=root/'public/models/humanoid/RiggedRobot.glb'
data=source.read_bytes(); jslen=struct.unpack_from('<I',data,12)[0]; g=json.loads(data[20:20+jslen]); offset=20+jslen; binary=data[offset+8:]
dtypes={5126:np.float32,5125:np.uint32,5123:np.uint16,5121:np.uint8}; counts={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def accessor(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];dt=np.dtype(dtypes[a['componentType']]);n=counts[a['type']];start=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',dt.itemsize*n)
 return np.ndarray((a['count'],n),dtype=dt,buffer=binary,offset=start,strides=(stride,dt.itemsize)).copy()
def matrix(node):
 if 'matrix' in node:return np.array(node['matrix']).reshape((4,4),order='F')
 t=node.get('translation',[0,0,0]);x,y,z,w=node.get('rotation',[0,0,0,1]);s=node.get('scale',[1,1,1]);m=np.eye(4)
 m[:3,:3]=np.array([[1-2*y*y-2*z*z,2*x*y-2*z*w,2*x*z+2*y*w],[2*x*y+2*z*w,1-2*x*x-2*z*z,2*y*z-2*x*w],[2*x*z-2*y*w,2*y*z+2*x*w,1-2*x*x-2*y*y]])@np.diag(s);m[:3,3]=t;return m
parents={c:i for i,n in enumerate(g['nodes']) for c in n.get('children',[])};world={}
def wm(i):
 if i not in world:world[i]=(wm(parents[i]) if i in parents else np.eye(4))@matrix(g['nodes'][i])
 return world[i]
primitives=[];points=[]
for i,n in enumerate(g['nodes']):
 if 'mesh' not in n:continue
 for p in g['meshes'][n['mesh']]['primitives']:
  a=p['attributes'];pos=accessor(a['POSITION']);v=(wm(i)@np.c_[pos,np.ones(len(pos))].T).T[:,:3];points.append(v);primitives.append((i,p,v))
allpoints=np.concatenate(points);lo=allpoints.min(axis=0);hi=allpoints.max(axis=0);scale=1.6/(hi[1]-lo[1]);N=np.eye(4);N[:3,:3]*=scale;N[:3,3]=-np.array([(lo[0]+hi[0])/2,lo[1],(lo[2]+hi[2])/2])*scale
skin=g['skins'][0];joints=skin['joints'];indices={j:i for i,j in enumerate(joints)}
def jointpath(j):
 parent=parents.get(j);name=g['nodes'][j]['name'].replace('.','_')
 return (jointpath(parent)+'/' if parent in indices else '')+name
paths=[jointpath(j) for j in joints];bind=[N@wm(j) for j in joints];rest=[np.linalg.inv(bind[indices[parents[j]]])@bind[k] if parents.get(j) in indices else bind[k] for k,j in enumerate(joints)]
def gf(m):return Gf.Matrix4d(*m.T.flatten().tolist())
with tempfile.TemporaryDirectory() as temp:
 usdc=pathlib.Path(temp)/'NeoHumanoid.usdc';stage=Usd.Stage.CreateNew(str(usdc));UsdGeom.SetStageUpAxis(stage,UsdGeom.Tokens.y);UsdGeom.SetStageMetersPerUnit(stage,1)
 skroot=UsdSkel.Root.Define(stage,'/Neo');stage.SetDefaultPrim(skroot.GetPrim());skroot.GetPrim().SetCustomDataByKey('license','CC-BY-3.0; joney_lol; https://poly.pizza/m/BwjA6Thdzd')
 skeleton=UsdSkel.Skeleton.Define(stage,'/Neo/Skeleton');skeleton.CreateJointsAttr(paths);skeleton.CreateBindTransformsAttr([gf(m) for m in bind]);skeleton.CreateRestTransformsAttr([gf(m) for m in rest]);top=UsdSkel.Topology(Vt.TokenArray(paths));valid,why=top.Validate();assert valid,why
 triangles=0
 for number,(node,p,v) in enumerate(primitives):
  a=p['attributes'];positions=(N@np.c_[v,np.ones(len(v))].T).T[:,:3];mesh=UsdGeom.Mesh.Define(stage,f'/Neo/Part{number}');mesh.CreatePointsAttr(Vt.Vec3fArray.FromNumpy(positions.astype(np.float32)))
  ind=accessor(p['indices']).flatten().astype(np.int32);triangles+=len(ind)//3;mesh.CreateFaceVertexCountsAttr([3]*(len(ind)//3));mesh.CreateFaceVertexIndicesAttr(ind.tolist());mesh.CreateSubdivisionSchemeAttr('none');mesh.CreateDoubleSidedAttr(True)
  if 'NORMAL' in a:
   normal=accessor(a['NORMAL'])@np.linalg.inv(wm(node)[:3,:3]);normal/=np.linalg.norm(normal,axis=1)[:,None];mesh.CreateNormalsAttr(Vt.Vec3fArray.FromNumpy(normal.astype(np.float32)));mesh.SetNormalsInterpolation('vertex')
  binding=UsdSkel.BindingAPI.Apply(mesh.GetPrim());binding.CreateSkeletonRel().SetTargets([skeleton.GetPath()]);binding.CreateGeomBindTransformAttr(Gf.Matrix4d(1));binding.CreateJointIndicesPrimvar(False,4).Set(accessor(a['JOINTS_0']).astype(np.int32).flatten().tolist());weights=accessor(a['WEIGHTS_0']);assert np.isfinite(weights).all();weights/=weights.sum(axis=1)[:,None];binding.CreateJointWeightsPrimvar(False,4).Set(weights.flatten().tolist())
  material=UsdShade.Material.Define(stage,f'/Neo/Material{number}');shader=UsdShade.Shader.Define(stage,f'/Neo/Material{number}/Shader');shader.CreateIdAttr('UsdPreviewSurface');m=g.get('materials',[])[p.get('material',0)].get('pbrMetallicRoughness',{});color=m.get('baseColorFactor',[0.6,0.7,0.75,1]);shader.CreateInput('diffuseColor',Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(*color[:3]));shader.CreateInput('metallic',Sdf.ValueTypeNames.Float).Set(m.get('metallicFactor',0.35));shader.CreateInput('roughness',Sdf.ValueTypeNames.Float).Set(max(0.3,m.get('roughnessFactor',0.5)));material.CreateSurfaceOutput().ConnectToSource(shader.ConnectableAPI(),'surface');UsdShade.MaterialBindingAPI.Apply(mesh.GetPrim()).Bind(material)
 stage.GetRootLayer().Save();target=root/'ios/MyPersonalNeo/Resources/NeoHumanoid.usdz';assert UsdUtils.CreateNewUsdzPackage(Sdf.AssetPath(str(usdc)),str(target))
 # Reopen packaged file, validate binding and round-trip geometry budget.
 packaged=Usd.Stage.Open(str(target));cache=UsdSkel.Cache();cache.Populate(UsdSkel.Root(packaged.GetPrimAtPath('/Neo')),Usd.PrimDefaultPredicate);query=cache.GetSkelQuery(UsdSkel.Skeleton(packaged.GetPrimAtPath('/Neo/Skeleton')));assert query and len(query.GetJointOrder())==48
 manifest={'asset':'NeoHumanoid.usdz','source':'https://poly.pizza/m/BwjA6Thdzd','author':'joney_lol','license':'CC-BY-3.0','sourceSha256':hashlib.sha256(data).hexdigest(),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'joints':48,'skinnedMeshes':len(primitives),'triangles':triangles,'heightMeters':1.6,'bytes':target.stat().st_size,'modifications':'Existing repaired skin weights; converted GLB to USD Skel, normalized to 1.6 metres, PBR colors retained. Runtime poses/IK authored in Swift; no downloaded animations.'}
 (root/'ios/MyPersonalNeo/Resources/AvatarManifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps(manifest))
