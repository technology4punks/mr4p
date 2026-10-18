"""Build three mobile human USD Skel avatars from Microsoft Rocketbox (MIT).
No DCC. Requires assimp 5.4.3 CLI, usd-core 26.8, numpy 2.5.4, Pillow.
Downloads only pinned FBX/texture files; cache may be set with NEO_ASSET_CACHE.
"""
import concurrent.futures, hashlib, json, os, pathlib, re, subprocess, tempfile, urllib.request
import numpy as np
from PIL import Image
from pxr import Usd, UsdGeom, UsdShade, UsdSkel, UsdUtils, Sdf, Gf, Vt
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'ios/MyPersonalNeo/Resources'
REV='0943055db6ec570bcef9f2c8b41c9e5467c808f9'
BASE=f'https://raw.githubusercontent.com/microsoft/Microsoft-Rocketbox/{REV}/'
CACHE=pathlib.Path(os.environ.get('NEO_ASSET_CACHE','/tmp/neo-rocketbox'))
PEOPLE=[('Female_Adult_01','NeoSofia',1.68),('Male_Adult_01','NeoLuca',1.78),('Female_Adult_02','NeoElena',1.65)]
def get(path):
 dest=CACHE/path;dest.parent.mkdir(parents=True,exist_ok=True)
 if not dest.exists():urllib.request.urlretrieve(BASE+path,dest)
 return dest
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def gf(m):return Gf.Matrix4d(*m.T.flatten().tolist())
def build(person,asset,height):
 folder=f'Assets/Avatars/Adults/{person}'
 source=get(f'{folder}/Export/{person}.fbx')
 with tempfile.TemporaryDirectory() as temp:
  temp=pathlib.Path(temp);subprocess.run([os.environ.get('ASSIMP','assimp'),'export',str(source),str(temp/'input.gltf'),'-fgltf2'],check=True,stdout=subprocess.DEVNULL)
  g=json.loads((temp/'input.gltf').read_text());binary=(temp/'input.bin').read_bytes()
  def accessor(i):
   a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];dt=np.dtype({5126:np.float32,5125:np.uint32,5123:np.uint16,5121:np.uint8}[a['componentType']]);n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
   return np.ndarray((a['count'],n),dtype=dt,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',dt.itemsize*n),dt.itemsize)).copy()
  def matrix(n):
   if 'matrix'in n:return np.array(n['matrix']).reshape((4,4),order='F')
   x,y,z,w=n.get('rotation',[0,0,0,1]);m=np.eye(4);m[:3,:3]=np.array([[1-2*y*y-2*z*z,2*x*y-2*z*w,2*x*z+2*y*w],[2*x*y+2*z*w,1-2*x*x-2*z*z,2*y*z-2*x*w],[2*x*z-2*y*w,2*y*z+2*x*w,1-2*x*x-2*y*y]])@np.diag(n.get('scale',[1,1,1]));m[:3,3]=n.get('translation',[0,0,0]);return m
  parents={c:i for i,n in enumerate(g['nodes']) for c in n.get('children',[])};world={}
  def wm(i):
   if i not in world:world[i]=(wm(parents[i]) if i in parents else np.eye(4))@matrix(g['nodes'][i])
   return world[i]
  # Assimp preserves FBX pre-rotation nodes; world matrices already give Y-up, +Z forward.
  turn=np.eye(4)
  parts=[]
  for i,n in enumerate(g['nodes']):
   if 'mesh' not in n:continue
   for p in g['meshes'][n['mesh']]['primitives']:
    v=(turn@wm(i)@np.c_[accessor(p['attributes']['POSITION']),np.ones(g['accessors'][p['attributes']['POSITION']]['count'])].T).T[:,:3];parts.append((i,p,v))
  pts=np.concatenate([v for _,_,v in parts]);lo=pts.min(0);hi=pts.max(0);scale=height/(hi[1]-lo[1]);normalize=np.eye(4);normalize[:3,:3]*=scale;normalize[:3,3]=-np.array([(lo[0]+hi[0])/2,lo[1],(lo[2]+hi[2])/2])*scale;N=normalize@turn
  original=g['skins'][0]['joints']
  def depth(i):return depth(parents[i])+1 if i in parents else 0
  joints=sorted(original,key=depth);lookup={j:i for i,j in enumerate(joints)};remap=np.array([lookup[j] for j in original])
  def jp(j):return (jp(parents[j])+'/' if parents.get(j) in lookup else '')+re.sub('[^a-zA-Z0-9_]','_',g['nodes'][j]['name'])
  paths=[jp(j) for j in joints]
  # Uniform world-space rest axes simplify locally authored gestures/IK across all three bodies.
  bind=[]
  for j in joints:
   b=np.eye(4);b[:3,3]=(N@wm(j))[:3,3];bind.append(b)
  rest=[np.linalg.inv(bind[lookup[parents[j]]])@b if parents.get(j) in lookup else b for j,b in zip(joints,bind)]
  textures={};sourceHashes={str(source.relative_to(CACHE)):digest(source)}
  for mat in g['materials']:
   for key,slot in [('color',mat['pbrMetallicRoughness'].get('baseColorTexture')),('normal',mat.get('normalTexture'))]:
    if not slot:continue
    name=g['images'][g['textures'][slot['index']]['source']]['uri'].replace('\\','/').split('/')[-1]
    src=get(f'{folder}/Textures/{name}');sourceHashes[str(src.relative_to(CACHE))]=digest(src)
    im=Image.open(src);im.thumbnail((1024,1024),Image.Resampling.LANCZOS)
    filename=pathlib.Path(name).stem+'.png';im.save(temp/filename,optimize=True);textures[(mat['name'],key)]=filename
  stage=Usd.Stage.CreateNew(str(temp/(asset+'.usdc')));UsdGeom.SetStageUpAxis(stage,'Y');UsdGeom.SetStageMetersPerUnit(stage,1)
  sr=UsdSkel.Root.Define(stage,'/Neo');stage.SetDefaultPrim(sr.GetPrim());sr.GetPrim().SetCustomDataByKey('license','MIT; Copyright (c) 2020 Microsoft')
  sk=UsdSkel.Skeleton.Define(stage,'/Neo/Skeleton');sk.CreateJointsAttr(paths);sk.CreateBindTransformsAttr([gf(m) for m in bind]);sk.CreateRestTransformsAttr([gf(m) for m in rest]);assert UsdSkel.Topology(Vt.TokenArray(paths)).Validate()[0]
  triangles=0
  for number,(node,p,v) in enumerate(parts):
   a=p['attributes'];positions=(normalize@np.c_[v,np.ones(len(v))].T).T[:,:3];mesh=UsdGeom.Mesh.Define(stage,f'/Neo/Part{number}');mesh.CreatePointsAttr(Vt.Vec3fArray.FromNumpy(positions.astype(np.float32)))
   ind=accessor(p['indices']).flatten().astype(np.int32);triangles+=len(ind)//3;mesh.CreateFaceVertexCountsAttr([3]*(len(ind)//3));mesh.CreateFaceVertexIndicesAttr(ind.tolist());mesh.CreateSubdivisionSchemeAttr('none');mesh.CreateDoubleSidedAttr(True)
   normals=accessor(a['NORMAL'])@np.linalg.inv((N@wm(node))[:3,:3]);normals/=np.linalg.norm(normals,axis=1)[:,None];mesh.CreateNormalsAttr(Vt.Vec3fArray.FromNumpy(normals.astype(np.float32)));mesh.SetNormalsInterpolation('vertex')
   uv=accessor(a['TEXCOORD_0']);uv[:,1]=1-uv[:,1];UsdGeom.PrimvarsAPI(mesh).CreatePrimvar('st',Sdf.ValueTypeNames.TexCoord2fArray,UsdGeom.Tokens.vertex).Set(Vt.Vec2fArray.FromNumpy(uv.astype(np.float32)))
   binding=UsdSkel.BindingAPI.Apply(mesh.GetPrim());binding.CreateSkeletonRel().SetTargets([sk.GetPath()]);binding.CreateGeomBindTransformAttr(Gf.Matrix4d(1));binding.CreateJointIndicesPrimvar(False,4).Set(remap[accessor(a['JOINTS_0']).astype(np.int32)].flatten().tolist());w=accessor(a['WEIGHTS_0']);assert np.isfinite(w).all() and (w.sum(1)>0).all();w/=w.sum(1)[:,None];binding.CreateJointWeightsPrimvar(False,4).Set(w.flatten().tolist())
   mat=g['materials'][p['material']];material=UsdShade.Material.Define(stage,f'/Neo/Material{number}');shader=UsdShade.Shader.Define(stage,f'/Neo/Material{number}/Surface');shader.CreateIdAttr('UsdPreviewSurface');shader.CreateInput('metallic',Sdf.ValueTypeNames.Float).Set(0);shader.CreateInput('roughness',Sdf.ValueTypeNames.Float).Set(0.72 if 'body'in mat['name'] else 0.6)
   reader=UsdShade.Shader.Define(stage,f'/Neo/Material{number}/UV');reader.CreateIdAttr('UsdPrimvarReader_float2');reader.CreateInput('varname',Sdf.ValueTypeNames.Token).Set('st')
   for key in ['color','normal']:
    filename=textures.get((mat['name'],key))
    if not filename:continue
    tex=UsdShade.Shader.Define(stage,f'/Neo/Material{number}/{key}');tex.CreateIdAttr('UsdUVTexture');tex.CreateInput('file',Sdf.ValueTypeNames.Asset).Set(Sdf.AssetPath(filename));tex.CreateInput('st',Sdf.ValueTypeNames.Float2).ConnectToSource(reader.ConnectableAPI(),'result');tex.CreateInput('sourceColorSpace',Sdf.ValueTypeNames.Token).Set('sRGB' if key=='color' else 'raw');tex.CreateOutput('rgb',Sdf.ValueTypeNames.Float3);shader.CreateInput('diffuseColor' if key=='color' else 'normal',Sdf.ValueTypeNames.Color3f if key=='color' else Sdf.ValueTypeNames.Normal3f).ConnectToSource(tex.ConnectableAPI(),'rgb')
    if key=='normal':tex.CreateInput('scale',Sdf.ValueTypeNames.Float4).Set(Gf.Vec4f(2,2,2,1));tex.CreateInput('bias',Sdf.ValueTypeNames.Float4).Set(Gf.Vec4f(-1,-1,-1,0))
    if key=='color' and 'opacity'in mat['name']:
     tex.CreateOutput('a',Sdf.ValueTypeNames.Float);shader.CreateInput('opacity',Sdf.ValueTypeNames.Float).ConnectToSource(tex.ConnectableAPI(),'a');shader.CreateInput('opacityThreshold',Sdf.ValueTypeNames.Float).Set(0.35)
   material.CreateSurfaceOutput().ConnectToSource(shader.ConnectableAPI(),'surface');UsdShade.MaterialBindingAPI.Apply(mesh.GetPrim()).Bind(material)
  stage.GetRootLayer().Save();target=OUT/(asset+'.usdz');target.unlink(missing_ok=True);assert UsdUtils.CreateNewUsdzPackage(Sdf.AssetPath(str(temp/(asset+'.usdc'))),str(target))
  preview=get(f'{folder}/{person}.png');Image.open(preview).convert("RGB").resize((640,360),Image.Resampling.LANCZOS).save(OUT/(asset+'.jpg'),quality=88)
  packaged=Usd.Stage.Open(str(target));assert packaged and len(UsdSkel.Skeleton(packaged.GetPrimAtPath('/Neo/Skeleton')).GetJointsAttr().Get())==len(joints)
  return dict(asset=asset+'.usdz',person=person,source=f'https://github.com/microsoft/Microsoft-Rocketbox/tree/{REV}/{folder}',license='MIT',sha256=digest(target),sourceHashes=sourceHashes,joints=len(joints),triangles=triangles,skinnedMeshes=len(parts),maxTexture=1024,bytes=target.stat().st_size,heightMeters=height,modifications='FBX via Assimp 5.4.3; Y-up metres; topological joints with world-aligned rest axes; skin weights remapped; diffuse/normal textures 1024px PNG; hair alpha cutout. Local Swift animation, no downloaded motion clips.')
OUT.mkdir(exist_ok=True,parents=True)
manifest=[build(*p) for p in PEOPLE]
(OUT/'AvatarManifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(OUT/'Rocketbox-MIT.txt').write_bytes(get('LICENSE.md').read_bytes())
print(json.dumps(manifest,indent=2))
