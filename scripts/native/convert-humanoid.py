"""Quaternius CC0 -> mobile USD Skel: one mesh/material, 64px palette, no DCC.
Requires usd-core 26.8, numpy 2.5.4, Pillow 12.2.0. Public downloads are cached;
only the three selected glTF files are read. Source rigs retained, props/clips omitted.
"""
import base64, hashlib, json, os, pathlib, re, tempfile, urllib.request
import numpy as np
from PIL import Image
from pxr import Usd, UsdGeom, UsdShade, UsdSkel, UsdUtils, Sdf, Gf, Vt
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'ios/MyPersonalNeo/Resources';CACHE=pathlib.Path(os.getenv('NEO_ASSET_CACHE','/tmp/neo-toon'))
SPECS=[('NeoMan','1NhXHnGU0zK9hBrT5FoZp8nTz_EmvTPg5',1.72,'https://quaternius.com/packs/ultimatemodularcharacters.html','Suit'),('NeoWoman','1GjWtofxjmPku25cXJxHrzLLeUbXw7A_s',1.66,'https://quaternius.com/packs/ultimatemodularwomen.html','Suit'),('NeoDog','1XWUVbmMbiG9E90OqrumueD_pBdnYdyHZ',0.60,'https://quaternius.com/packs/ultimateanimatedanimals.html','ShibaInu')]
def get(name,id):
 p=CACHE/name;p.parent.mkdir(parents=True,exist_ok=True)
 if not p.exists():urllib.request.urlretrieve('https://drive.google.com/uc?export=download&id='+id,p)
 return p
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def gf(m):return Gf.Matrix4d(*m.T.flatten().tolist())
def build(asset,id,height,url,original):
 source=get(asset+'.gltf',id);g=json.loads(source.read_text());buffers=[base64.b64decode(b['uri'].split(',')[1]) for b in g['buffers']]
 def accessor(i):
  a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];dt=np.dtype({5126:np.float32,5125:np.uint32,5123:np.uint16,5121:np.uint8}[a['componentType']]);n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
  return np.ndarray((a['count'],n),dtype=dt,buffer=buffers[v['buffer']],offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',dt.itemsize*n),dt.itemsize)).copy()
 def matrix(n):
  if 'matrix'in n:return np.array(n['matrix']).reshape((4,4),order='F')
  x,y,z,w=n.get('rotation',[0,0,0,1]);m=np.eye(4);m[:3,:3]=np.array([[1-2*y*y-2*z*z,2*x*y-2*z*w,2*x*z+2*y*w],[2*x*y+2*z*w,1-2*x*x-2*z*z,2*y*z-2*x*w],[2*x*z-2*y*w,2*y*z+2*x*w,1-2*x*x-2*y*y]])@np.diag(n.get('scale',[1,1,1]));m[:3,3]=n.get('translation',[0,0,0]);return m
 parents={c:i for i,n in enumerate(g['nodes']) for c in n.get('children',[])};world={}
 def wm(i):
  if i not in world:world[i]=(wm(parents[i]) if i in parents else np.eye(4))@matrix(g['nodes'][i])
  return world[i]
 parts=[]
 for i,n in enumerate(g['nodes']):
  if 'mesh'not in n or 'skin'not in n or any(word in n.get('name','').lower() for word in ['pistol','weapon','sword']):continue # No pistol/accessory props from the source kit.
  for p in g['meshes'][n['mesh']]['primitives']:
   pos=accessor(p['attributes']['POSITION']);parts.append((i,p,(wm(i)@np.c_[pos,np.ones(len(pos))].T).T[:,:3]))
 pts=np.concatenate([v for _,_,v in parts]);lo=pts.min(0);hi=pts.max(0);scale=height/(hi[1]-lo[1]);N=np.eye(4);N[:3,:3]*=scale;N[:3,3]=-np.array([(lo[0]+hi[0])/2,lo[1],(lo[2]+hi[2])/2])*scale
 originalJoints=g['skins'][0]['joints']
 def depth(i):return depth(parents[i])+1 if i in parents else 0
 joints=sorted(originalJoints,key=depth);lookup={j:i for i,j in enumerate(joints)};remap=np.array([lookup[j] for j in originalJoints])
 def jp(j):return (jp(parents[j])+'/' if parents.get(j) in lookup else '')+re.sub('[^a-zA-Z0-9_]','_',g['nodes'][j]['name'])
 paths=[jp(j) for j in joints];bind=[]
 for j in joints:
  b=np.eye(4);b[:3,3]=(N@wm(j))[:3,3];bind.append(b)
 rest=[np.linalg.inv(bind[lookup[parents[j]]])@b if parents.get(j) in lookup else b for j,b in zip(joints,bind)]
 positions=[];normals=[];indices=[];uv=[];ji=[];jw=[];count=0
 for node,p,v in parts:
  a=p['attributes'];positions.append((N@np.c_[v,np.ones(len(v))].T).T[:,:3]);n=accessor(a['NORMAL'])@np.linalg.inv((N@wm(node))[:3,:3]);n/=np.linalg.norm(n,axis=1)[:,None];normals.append(n);indices.extend((accessor(p['indices']).flatten()+count).tolist());count+=len(v)
  mat=p.get('material',0);uv.extend([[(mat%8+0.5)/8,(mat//8+0.5)/8]]*len(v));ji.extend(remap[accessor(a['JOINTS_0']).astype(np.int32)].flatten().tolist());w=accessor(a['WEIGHTS_0']);assert np.isfinite(w).all() and (w.sum(1)>0).all();w/=w.sum(1)[:,None];jw.extend(w.flatten().tolist())
 with tempfile.TemporaryDirectory() as temp:
  temp=pathlib.Path(temp);image=Image.new('RGB',(64,64))
  for i,m in enumerate(g['materials']):
   linear=m.get('pbrMetallicRoughness',{}).get('baseColorFactor',[.5,.5,.5,1])[:3];color=tuple(round(255*(12.92*x if x<=.0031308 else 1.055*x**(1/2.4)-.055)) for x in linear)
   # USD st origin is bottom-left; image storage is top-left.
   for x in range((i%8)*8,(i%8+1)*8):
    for y in range(64-(i//8+1)*8,64-(i//8)*8):image.putpixel((x,y),color)
  image.save(temp/'palette.png',optimize=True)
  stage=Usd.Stage.CreateNew(str(temp/(asset+'.usdc')));UsdGeom.SetStageUpAxis(stage,UsdGeom.Tokens.y);UsdGeom.SetStageMetersPerUnit(stage,1)
  sr=UsdSkel.Root.Define(stage,'/Neo');stage.SetDefaultPrim(sr.GetPrim());sr.GetPrim().SetCustomDataByKey('license','CC0-1.0; Quaternius; '+url)
  sk=UsdSkel.Skeleton.Define(stage,'/Neo/Skeleton');sk.CreateJointsAttr(paths);sk.CreateBindTransformsAttr([gf(m) for m in bind]);sk.CreateRestTransformsAttr([gf(m) for m in rest]);assert UsdSkel.Topology(Vt.TokenArray(paths)).Validate()[0]
  mesh=UsdGeom.Mesh.Define(stage,'/Neo/Body');mesh.CreatePointsAttr(Vt.Vec3fArray.FromNumpy(np.concatenate(positions).astype(np.float32)));mesh.CreateNormalsAttr(Vt.Vec3fArray.FromNumpy(np.concatenate(normals).astype(np.float32)));mesh.SetNormalsInterpolation('vertex');mesh.CreateFaceVertexCountsAttr([3]*(len(indices)//3));mesh.CreateFaceVertexIndicesAttr(indices);mesh.CreateSubdivisionSchemeAttr('none');mesh.CreateDoubleSidedAttr(False)
  UsdGeom.PrimvarsAPI(mesh).CreatePrimvar('st',Sdf.ValueTypeNames.TexCoord2fArray,UsdGeom.Tokens.vertex).Set(Vt.Vec2fArray.FromNumpy(np.array(uv,dtype=np.float32)))
  binding=UsdSkel.BindingAPI.Apply(mesh.GetPrim());binding.CreateSkeletonRel().SetTargets([sk.GetPath()]);binding.CreateGeomBindTransformAttr(Gf.Matrix4d(1));binding.CreateJointIndicesPrimvar(False,4).Set(ji);binding.CreateJointWeightsPrimvar(False,4).Set(jw)
  material=UsdShade.Material.Define(stage,'/Neo/Palette');shader=UsdShade.Shader.Define(stage,'/Neo/Palette/Surface');shader.CreateIdAttr('UsdPreviewSurface');shader.CreateInput('metallic',Sdf.ValueTypeNames.Float).Set(0);shader.CreateInput('roughness',Sdf.ValueTypeNames.Float).Set(.85)
  reader=UsdShade.Shader.Define(stage,'/Neo/Palette/UV');reader.CreateIdAttr('UsdPrimvarReader_float2');reader.CreateInput('varname',Sdf.ValueTypeNames.Token).Set('st')
  tex=UsdShade.Shader.Define(stage,'/Neo/Palette/color');tex.CreateIdAttr('UsdUVTexture');tex.CreateInput('file',Sdf.ValueTypeNames.Asset).Set(Sdf.AssetPath('palette.png'));tex.CreateInput('st',Sdf.ValueTypeNames.Float2).ConnectToSource(reader.ConnectableAPI(),'result');tex.CreateInput('sourceColorSpace',Sdf.ValueTypeNames.Token).Set('sRGB');tex.CreateOutput('rgb',Sdf.ValueTypeNames.Float3);shader.CreateInput('diffuseColor',Sdf.ValueTypeNames.Color3f).ConnectToSource(tex.ConnectableAPI(),'rgb');material.CreateSurfaceOutput().ConnectToSource(shader.ConnectableAPI(),'surface');UsdShade.MaterialBindingAPI.Apply(mesh.GetPrim()).Bind(material)
  stage.GetRootLayer().Save();target=OUT/(asset+'.usdz');target.unlink(missing_ok=True);assert UsdUtils.CreateNewUsdzPackage(Sdf.AssetPath(str(temp/(asset+'.usdc'))),str(target));assert Usd.Stage.Open(str(target))
 return dict(asset=asset+'.usdz',person=original,source=url,download='https://drive.google.com/uc?export=download&id='+id,author='Quaternius',license='CC0-1.0',sourceSha256=digest(source),sha256=digest(target),joints=len(joints),triangles=len(indices)//3,skinnedMeshes=1,materials=1,textures=1,maxTexture=64,bytes=target.stat().st_size,heightMeters=height,modifications='Only skinned body, no weapon/accessory props. One merged mesh/material; 64px sRGB palette. World-aligned rest axes and topological joints, skin remapped. No source combat clips included; local Swift gestures/locomotion.')
OUT.mkdir(exist_ok=True,parents=True);manifest=[build(*s) for s in SPECS];(OUT/'AvatarManifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
licenses=[get(name,id).read_text() for name,id in [('Men-CC0.txt','1TTvylHa1CsiJuHFWWiv6PFGhLM-aAH5z'),('Women-CC0.txt','1lIFL16xEpoPbr0j_HUATgmcEnAmYoIK2'),('Animals-CC0.txt','1F2uy8T2fRpdc6gZ4mnS02_C2E63WvKtn')]]
(OUT/'Quaternius-CC0.txt').write_text('\n'.join(line.rstrip() for line in ('\n\n'.join(licenses)+'\nSources:\n'+'\n'.join(s[3] for s in SPECS)).splitlines())+'\n');print(json.dumps(manifest,indent=2))
