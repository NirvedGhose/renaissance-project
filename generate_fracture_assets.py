"""FRACTURE modular campus asset generator for Blender 3.6+ / 4.x.

Run: blender --background --python generate_fracture_assets.py
Outputs GLBs, preview GLB, contact sheet render, and validation_report.json
beside this script. Simulation topology and state are intentionally not encoded.
"""
import bpy, math, json, os, sys
from mathutils import Vector

OUT = os.path.dirname(os.path.abspath(__file__))
GLB = os.path.join(OUT, 'public', 'assets', 'glb')
PRE = os.path.join(OUT, 'public', 'assets', 'previews')
os.makedirs(GLB, exist_ok=True); os.makedirs(PRE, exist_ok=True)

COLORS = {'Ink':'#111820','Asphalt':'#29313A','Concrete':'#A9AAA5','Limestone':'#D8C9AD','Glass':'#7895A6','Copper':'#B77B4B','Green':'#526B54','Marking':'#E7E2D5','Accent':'#E7E2D5'}
def rgba(h):
    h=h.lstrip('#'); c=[int(h[i:i+2],16)/255 for i in (0,2,4)]; return (*[v/12.92 if v < .04045 else ((v+.055)/1.055)**2.4 for v in c],1)
def mat(name, color):
    m=bpy.data.materials.get('MAT_'+name) or bpy.data.materials.new('MAT_'+name); m.diffuse_color=rgba(color); m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value=rgba(color); bs.inputs['Roughness'].default_value=.72
    return m
M={k:mat(k,v) for k,v in COLORS.items()}
def cube(name, loc, scale, material, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o=bpy.context.object; o.name='FRACTURE_'+name; o.dimensions=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(M[material])
    if bevel:
        b=o.modifiers.new('SoftEdges','BEVEL'); b.width=bevel; b.segments=1; bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=b.name)
    return o
def cyl(name,loc,radius,depth,material,vertices=8):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc); o=bpy.context.object; o.name='FRACTURE_'+name; o.data.materials.append(M[material]); return o
def cone(name,loc,r1,r2,depth,material,vertices=9):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=r1,radius2=r2,depth=depth,location=loc); o=bpy.context.object; o.name='FRACTURE_'+name; o.data.materials.append(M[material]); return o
def begin():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def export(path, objects):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects: o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_materials='EXPORT', export_cameras=False, export_lights=False)
def box_building(kind, dims, floors, style):
    x,y,z=dims; floor_h=z*.78/floors; base=.2
    cube(kind+'_BODY',(0,0,base+z*.39),(x-.5,y-.5,z*.78),'Limestone',.12)
    cube(kind+'_PLINTH',(0,0,.16),(x,y,.32),'Concrete',.08)
    # repeated recessed-looking window panels on south and east facades
    cols=max(3,int(x/2.5)); rows=floors
    for r in range(rows):
      zz=base+floor_h*(r+.56)
      for i in range(cols):
        xx=-x*.39 + i*(x*.78/max(1,cols-1))
        cube(kind+'_WINDOW_%02d_%02d'%(r,i),(xx,-y*.251,zz),(.82,.055,.88),'Glass',.025)
        cube(kind+'_SILL_%02d_%02d'%(r,i),(xx,-y*.273,zz-.49),(.96,.13,.09),'Concrete')
    for r in range(rows):
      for i in range(max(2,int(y/2.5))):
        yy=-y*.36+i*(y*.72/max(1,int(y/2.5)-1)); cube(kind+'_SIDE_WINDOW_%02d_%02d'%(r,i),(x*.251,yy,base+floor_h*(r+.56)),(.05,.8,.88),'Glass',.02)
    cube(kind+'_ROOF',(0,0,z-.12),(x,y,.24),'Concrete',.04)
    # parapet
    cube(kind+'_PARAPET_FRONT',(0,-y/2+.12,z+.05),(x,.24,.5),'Limestone',.04)
    cube(kind+'_PARAPET_BACK',(0,y/2-.12,z+.05),(x,.24,.5),'Limestone',.04)
    # entrance on south facade
    cube(kind+'_DOOR',(0,-y*.252,.9),(1.5,.10,1.8),'Ink',.03)
    cube(kind+'_CANOPY',(0,-y*.34,2.15),(3.5,1,.22),'Copper',.06)
    cube('STATE_ACCENT',(0,-y*.355,2.28),(1.6,.05,.12),'Accent')
    cube(kind+'_STEP',(0,-y*.36,.3),(3.4,1,.28),'Concrete',.05)
    if style=='library':
      cube(kind+'_READING_GLAZING',(0,-y*.256,base+z*.28),(x*.40,.07,z*.42),'Glass',.04)
      for i in range(3): cube(kind+'_SKYLIGHT_'+str(i),(-x*.28+i*x*.28,0,z+.19),(1.1,y*.55,.12),'Glass',.04)
    if style=='lab':
      for i in range(3): cube(kind+'_VENT_'+str(i),(-x*.3+i*x*.3,y*.2,z+.48),(1.1,1,.7),'Ink',.08)
      cube(kind+'_SERVICE_DOOR',(x*.25,-y*.255,1.1),(1.4,.08,2.2),'Ink',.03)
    if style=='auditorium':
      cube(kind+'_HALL',(0,y*.06,z*.40),(x*.48,y*.7,z*.78),'Limestone',.1)
      for i in range(11): cube(kind+'_FIN_'+str(i),(-x*.46+i*x*.092,-y*.265,z*.42),(.12,.2,z*.68),'Copper')
    if style=='utility':
      for i in range(3): cube(kind+'_VENT_'+str(i),(-1.8+i*1.8,y*.18,z+.4),(.7,.6,.6),'Ink')
    return bpy.context.scene.objects[:]

ASSETS=[
('building_academic_block',(18,12,11),'building','academic'),('building_library',(20,14,9),'building','library'),('building_administration',(14,10,10),'building','admin'),('building_laboratory',(16,12,8),'building','lab'),('building_auditorium',(22,16,8),'building','auditorium'),('building_utility',(8,6,4),'building','utility'),
('road_straight',(12,5,.18),'road','straight'),('road_corner_90',(8,8,.18),'road','corner'),('junction_4way',(8,8,.18),'junction','four'),('junction_t',(8,8,.18),'junction','tee'),
('access_pedestrian_gate',(4,1,3),'access','gate'),('access_emergency_exit',(3,1,3.5),'access','exit'),('access_ramp_stairs',(5,3,1.2),'access','ramp'),('prop_tree',(2.5,2.5,5),'prop','tree'),('prop_lamp_post',(.35,.35,4.5),'prop','lamp'),('prop_bench',(1.8,.6,.9),'prop','bench'),('prop_signboard_blank',(1.2,.25,2),'prop','sign'),('environment_sidewalk_tile',(4,4,.2),'environment','sidewalk'),('environment_landscape_island',(5,3,.35),'environment','island'),('prop_blocker_barrier',(2.2,.5,1.1),'prop','barrier'),('environment_ground_base',(100,80,.5),'environment','base')]

def make(name,d,kind,style):
    before=set(bpy.context.scene.objects)
    x,y,z=d
    if kind=='building':
      box_building(name,d, 3 if style in ('academic','admin') else (1 if style=='utility' else 2),style)
      return [o for o in bpy.context.scene.objects if o not in before]
    if style=='straight':
      cube('ROAD_STRAIGHT_SURFACE',(0,0,.09),(x,y,.18),'Asphalt'); cube('STATE_ACCENT',(0,0,.19),(1,.07,.02),'Accent')
      for xx in (-x*.35,-x*.1,x*.15,x*.4): cube('ROAD_DASH',(xx,0,.195),(1.1,.09,.015),'Marking')
      for yy in (-y/2+.18,y/2-.18): cube('ROAD_CURB',(0,yy,.12),(x,.24,.24),'Concrete')
    elif style in ('corner','four','tee'):
      cube('JUNCTION_BASE',(0,0,.09),(x,y,.18),'Asphalt'); cube('STATE_ACCENT',(0,0,.195),(1,.12,.015),'Accent')
      arms=[(0,-1),(0,1),(-1,0),(1,0)] if style!='tee' else [(0,-1),(-1,0),(1,0)]
      for a,b in arms:
        if a==0: cube('JUNCTION_MARK',(0,b*2.5,.195),(.12,2.4,.015),'Marking')
        else: cube('JUNCTION_MARK',(a*2.5,0, .195),(2.4,.12,.015),'Marking')
    elif style=='gate':
      for xx in (-1.8,1.8): cube('GATE_POST',(xx,0,1.5),(.22,.22,3),'Concrete',.04)
      cube('GATE_HEADER',(0,0,2.9),(4,.22,.2),'Copper'); cube('STATE_ACCENT',(0,-.13,2.72),(1.5,.04,.12),'Accent')
      for xx in [-1.3,-.65,0,.65,1.3]: cube('GATE_BAR',(xx,0,1.1),(.07,.08,1.8),'Ink')
    elif style=='exit':
      for xx in (-1.3,1.3): cube('EXIT_POST',(xx,0,1.65),(.18,.2,3.3),'Concrete')
      cube('EXIT_HEADER',(0,0,3.25),(3,.2,.3),'Ink'); cube('EXIT_SIGN',(0,-.13,2.88),(1.2,.05,.42),'Copper'); cube('STATE_ACCENT',(0,-.17,2.6),(.8,.03,.1),'Accent')
    elif style=='ramp':
      for i in range(5): cube('RAMP_STEP',(0,-1.2+i*.55,.12+i*.19),(2.3,.62,.24+i*.38),'Concrete')
      for xx in (-1.25,1.25): cube('RAMP_RAIL',(xx,0,.8),(.08,2.8,.08),'Ink')
    elif style=='tree':
      cyl('TREE_TRUNK',(0,0,1.35),.22,2.7,'Copper'); cone('TREE_CANOPY',(0,0,3.45),1.22,.15,2.7,'Green')
    elif style=='lamp':
      cyl('LAMP_POLE',(0,0,2.1),.055,4.2,'Ink'); cube('LAMP_ARM',(.28,0,4.1),(.65,.07,.07),'Ink'); cube('LAMP_HEAD',(.58,0,4.02),(.38,.32,.16),'Copper')
    elif style=='bench':
      for i in range(4): cube('BENCH_SLAT',(0,-.19+i*.12,.48),(1.8,.09,.12),'Copper')
      for xx in (-.65,.65): cube('BENCH_LEG',(xx,0,.23),(.12,.42,.46),'Ink'); cube('BENCH_BACK',(xx, .24,.68),(.12,.1,.42),'Ink')
    elif style=='sign':
      cube('SIGN_POST',(0,0,.8),(.12,.12,1.6),'Ink'); cube('SIGN_FACE',(0,-.03,1.5),(1.2,.12,.75),'Limestone'); cube('STATE_ACCENT',(0,-.1,1.5),(.16,.025,.48),'Accent')
    elif style=='sidewalk':
      cube('SIDEWALK_TILE',(0,0,.1),(4,4,.2),'Concrete'); cube('SIDEWALK_CURB',(0,-1.88,.2),(4,.24,.2),'Limestone')
      for t in (-1,0,1): cube('TILE_SEAM',(t,0,.205),(.025,3.7,.01),'Limestone')
    elif style=='island':
      cube('ISLAND_BORDER',(0,0,.12),(5,3,.24),'Concrete',.12); cube('ISLAND_SOIL',(0,0,.23),(4.7,2.7,.12),'Green')
      for xx in (-1.5,0,1.5): cone('ISLAND_SHRUB',(xx,0,.65),.45,.18,.8,'Green')
    elif style=='barrier':
      cube('BARRIER_BODY',(0,0,.48),(2.2,.5,.72),'Copper',.07); cube('STATE_ACCENT',(0,-.26,.5),(1.7,.025,.2),'Accent')
      for xx in (-.75,.75): cube('BARRIER_FOOT',(xx,0,.08),(.35,.85,.16),'Ink')
    elif style=='base': cube('GROUND_BASE',(0,0,.25),(100,80,.5),'Green',.4)
    return [o for o in bpy.context.scene.objects if o not in before]

def validate(path,d):
    # Structural validation will be run against the exported GLB on a clean import.
    begin(); bpy.ops.import_scene.gltf(filepath=path)
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    if not meshes: return {'file':os.path.basename(path),'status':'FAIL','reason':'No meshes after re-import'}
    bpy.context.view_layer.update(); points=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
    size=[max(p[i] for p in points)-min(p[i] for p in points) for i in range(3)]
    actual=sum(len(o.data.polygons) for o in meshes)
    expected=list(d); ok=all(abs(a-e)<=max(.02,e*.02) for a,e in zip(size,expected))
    return {'file':os.path.basename(path),'status':'PASS' if ok else 'WARN','dimensions_m':[round(v,4) for v in size],'expected_dimensions_m':expected,'polygon_count':actual,'mesh_count':len(meshes),'dimension_tolerance_pass':ok}

def scene_preview():
    begin(); objs=[]
    # include a small set of representative repeated instances, all visual-only
    plan=[('building_academic_block',(-22,10,0)),('building_library',(0,19,0)),('building_administration',(22,10,0)),('building_laboratory',(-20,-13,0)),('building_auditorium',(5,-23,0)),('building_utility',(27,-16,0))]
    for nm,loc in plan:
      d=next(a[1] for a in ASSETS if a[0]==nm); oo=make(nm,d,'building',next(a[3] for a in ASSETS if a[0]==nm))
      for o in oo: o.location.x+=loc[0]; o.location.y+=loc[1]
      objs+=oo
    objs.append(cube('PREVIEW_GROUND',(0,0,-.32),(100,80,.5),'Green',.4))
    for xx in (-35,-20,-5,10,25,40):
      for yy in (-30,30):
        trees=make('prop_tree',(2.5,2.5,5),'prop','tree')
        for o in trees: o.location.x+=xx; o.location.y+=yy
        objs+=trees
    # road grid decorative only
    for yy in (-8,2):
      road=make('road_straight',(12,5,.18),'road','straight')
      for o in road: o.location.y+=yy
      objs+=road
    bpy.ops.object.camera_add(location=(75,-88,82)); cam=bpy.context.object; cam.name='FRACTURE_PREVIEW_CAMERA'; cam.rotation_euler=(math.radians(36),0,math.radians(40)); cam.data.lens=48; bpy.context.scene.camera=cam
    bpy.ops.object.light_add(type='AREA',location=(10,-30,55)); light=bpy.context.object; light.data.energy=5500; light.data.shape='DISK'; light.data.size=35
    bpy.context.scene.render.engine='BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
    bpy.context.scene.render.resolution_x=1400; bpy.context.scene.render.resolution_y=1000; bpy.context.scene.render.resolution_percentage=100
    bpy.context.scene.world.color=(.18,.18,.18); bpy.context.scene.render.image_settings.file_format='PNG'; bpy.context.scene.render.filepath=os.path.join(PRE,'contact_sheet.png')
    bpy.ops.render.render(write_still=True)
    # Export preview geometry only; camera and lights excluded
    export(os.path.join(PRE,'fracture_campus_preview.glb'),objs)

def main():
    report=[]
    for name,d,kind,style in ASSETS:
      begin(); objs=make(name,d,kind,style)
      # exact asset bounds rely on manifest dimensions. Export does not introduce arbitrary scale.
      path=os.path.join(GLB,name+'.glb'); export(path,objs)
      report.append(validate(path,d))
    try: scene_preview(); preview='generated'
    except Exception as e: preview='failed: '+str(e)
    with open(os.path.join(PRE,'validation_report.json'),'w',encoding='utf8') as f: json.dump({'generator':'generate_fracture_assets.py','assets':report,'preview':preview},f,indent=2)
if __name__=='__main__': main()
