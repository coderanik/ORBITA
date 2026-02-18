#!/usr/bin/env python3
"""Generate draw.io XML for ORBITA ER diagram — Chen Notation. 9 Original Entities."""
import math, html as H

SC = {
    'catalog':   ('#dae8fc','#6c8ebf'),
    'tracking':  ('#d5e8d4','#82b366'),
    'telemetry': ('#fff2cc','#d6b656'),
    'analytics': ('#f8cecc','#b85450'),
}
EW, EH = 120, 40
AH = 20
DW, DH = 90, 46

ENTITIES = [
  dict(id='e1', name='SpaceObject', schema='catalog', x=1800, y=1400, r=320, assoc=False,
    attrs=[('object_id','pk'),('norad_id','u'),('cospar_id','u'),('name',''),
           ('object_type',''),('launch_date',''),('decay_date',''),('launch_site',''),
           ('country_code',''),('operator',''),('owner',''),('mass_kg',''),
           ('cross_section_m2',''),('orbit_class',''),('status',''),('purpose',''),
           ('metadata',''),('created_at',''),('updated_at','')]),

  dict(id='e2', name='Mission', schema='catalog', x=400, y=700, r=200,
    attrs=[('mission_id','pk'),('name',''),('description',''),('operator',''),
           ('launch_date',''),('end_date',''),('status',''),('metadata',''),
           ('created_at',''),('updated_at','')]),

  dict(id='e3', name='MissionObject', schema='catalog', x=1000, y=500, r=100, assoc=True,
    attrs=[('mission_id','pkfk'),('object_id','pkfk'),('role','')]),

  dict(id='e4', name='OrbitState', schema='tracking', x=3400, y=500, r=350,
    attrs=[('state_id','pk'),('epoch','pk'),('object_id','fk'),('position_x_km',''),
           ('position_y_km',''),('position_z_km',''),('velocity_x_km_s',''),
           ('velocity_y_km_s',''),('velocity_z_km_s',''),('reference_frame',''),
           ('position_geom','dv'),('semimajor_axis_km',''),('eccentricity',''),
           ('inclination_deg',''),('raan_deg',''),('arg_perigee_deg',''),
           ('true_anomaly_deg',''),('mean_anomaly_deg',''),('mean_motion_rev_day',''),
           ('period_minutes',''),('apoapsis_km','dv'),('periapsis_km','dv'),
           ('tle_line1',''),('tle_line2',''),('covariance_matrix',''),
           ('source',''),('created_at','')]),

  dict(id='e5', name='GroundStation', schema='tracking', x=3600, y=1600, r=200,
    attrs=[('station_id','pk'),('name',''),('location',''),('country_code',''),
           ('operator',''),('station_type',''),('frequency_bands',''),
           ('antenna_diameter_m',''),('min_elevation_deg',''),('capabilities',''),
           ('is_active',''),('created_at','')]),

  dict(id='e6', name='SatelliteTelemetry', schema='telemetry', x=3200, y=2400, r=180,
    attrs=[('telemetry_id','pk'),('ts','pk'),('object_id','fk'),('subsystem',''),
           ('parameter_name',''),('value',''),('unit',''),('quality',''),('raw_data','')]),

  dict(id='e7', name='ConjunctionEvent', schema='analytics', x=1200, y=2500, r=280,
    attrs=[('conjunction_id','pk'),('primary_object_id','fk'),('secondary_object_id','fk'),
           ('time_of_closest_approach',''),('miss_distance_km',''),('miss_distance_radial_km',''),
           ('miss_distance_in_track_km',''),('miss_distance_cross_track_km',''),
           ('collision_probability',''),('relative_velocity_km_s',''),
           ('combined_hard_body_radius_m',''),('covariance_primary',''),('covariance_secondary',''),
           ('cdm_id',''),('cdm_data',''),('risk_level',''),('status',''),
           ('recommended_action',''),('created_at',''),('updated_at','')]),

  dict(id='e8', name='SpaceWeather', schema='analytics', x=400, y=2200, r=200,
    attrs=[('weather_id','pk'),('ts','pk'),('solar_flux_f10_7',''),('kp_index',''),
           ('ap_index',''),('dst_index',''),('bz_gsm_nt',''),('proton_density_cm3',''),
           ('solar_wind_speed_km_s',''),('proton_flux',''),('electron_flux',''),
           ('geomagnetic_storm_level',''),('solar_flare_class',''),('data_source',''),
           ('is_forecast',''),('created_at','')]),

  dict(id='e9', name='ManeuverLog', schema='analytics', x=400, y=1500, r=170,
    attrs=[('maneuver_id','pk'),('object_id','fk'),('conjunction_id','fk'),('planned_time',''),
           ('executed_time',''),('delta_v_m_s',''),('direction',''),('status',''),
           ('notes',''),('created_at','')]),
]

RELS = [
    ('r1','HAS','e1','e4','1','N'),
    ('r2','GENERATES','e1','e6','1','N'),
    ('r3','INVOLVES','e1','e7','M','N'),
    ('r4','PERFORMS','e1','e9','1','N'),
    ('r5','CONTAINS','e2','e1','M','N'),
    ('r6','TRIGGERS','e7','e9','1','N'),
    ('r7','CORRELATES','e8','e6','',''),
]

eid = 100
def nid():
    global eid; eid += 1; return str(eid)

def aw(name):
    return max(56, len(name) * 5.5 + 12)

def attr_style(typ):
    base = 'ellipse;whiteSpace=wrap;html=1;fontSize=8;'
    if typ == 'pk':    return base + 'fillColor=#d5e8d4;strokeColor=#82b366;'
    if typ == 'fk':    return base + 'fillColor=#fff2cc;strokeColor=#d6b656;dashed=1;'
    if typ == 'pkfk':  return base + 'fillColor=#d5e8d4;strokeColor=#82b366;dashed=1;'
    if typ == 'dv':    return base + 'fillColor=#f5f5f5;strokeColor=#999999;dashed=1;dashPattern=5 3;'
    if typ == 'u':     return base + 'fillColor=#dae8fc;strokeColor=#6c8ebf;strokeWidth=2;'
    return base + 'fillColor=#f5f5f5;strokeColor=#666666;'

def attr_label(name, typ):
    e = H.escape(name)
    if typ in ('pk','pkfk'): return f'<u><b>{e}</b></u>'
    if typ == 'fk':          return f'<i>{e}</i>'
    if typ == 'dv':          return f'<i>/{e}/</i>'
    return e

cells = []
def xesc(s):
    return s.replace('&','&amp;').replace('"','&quot;').replace('<','&lt;').replace('>','&gt;')

def cell(cid, val, sty, x, y, w, h):
    cells.append(f'        <mxCell id="{cid}" value="{xesc(val)}" style="{sty}" vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')

def edge(cid, src, tgt, sty='endArrow=none;strokeColor=#999999;'):
    cells.append(f'        <mxCell id="{cid}" value="" style="{sty}" edge="1" source="{src}" target="{tgt}" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>')

emap = {e['id']: e for e in ENTITIES}

# ── Entities + Attributes ──
for e in ENTITIES:
    fill, stroke = SC[e['schema']]
    is_assoc = e.get('assoc', False)
    lbl = f'<b>{H.escape(e["name"])}</b><br/><font style="font-size:8px">[{e["schema"]}]</font>'
    if is_assoc:
        sty = f'shape=process;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};fontSize=10;backgroundOutline=1;size=0.06;'
    else:
        sty = f'rounded=0;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};fontSize=10;verticalAlign=middle;'
    cell(e['id'], lbl, sty, e['x']-EW//2, e['y']-EH//2, EW, EH)

    n = len(e['attrs']); r = e['r']
    for i, (aname, atype) in enumerate(e['attrs']):
        ang = (2*math.pi*i/n) - math.pi/2
        w = int(aw(aname))
        ax = int(e['x'] + r*math.cos(ang) - w//2)
        ay = int(e['y'] + r*math.sin(ang) - AH//2)
        aid = f'{e["id"]}_a{i}'
        cell(aid, attr_label(aname, atype), attr_style(atype), ax, ay, w, AH)
        edge(nid(), e['id'], aid, 'endArrow=none;strokeColor=#CCCCCC;strokeWidth=0.8;')

# ── Relationships ──
for rid, label, fid, tid, cf, ct in RELS:
    fe, te = emap[fid], emap[tid]
    dx = (fe['x']+te['x'])//2; dy = (fe['y']+te['y'])//2
    tmp = rid == 'r7'
    ds = 'rhombus;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;fontSize=8;fontStyle=1;'
    if tmp: ds += 'dashed=1;dashPattern=5 3;'
    cell(rid, H.escape(label), ds, dx-DW//2, dy-DH//2, DW, DH)
    ls = 'endArrow=none;strokeColor=#B85450;strokeWidth=1.5;'
    if tmp: ls += 'dashed=1;dashPattern=5 3;'
    edge(nid(), fid, rid, ls); edge(nid(), rid, tid, ls)
    if cf:
        cx=int(fe['x']+(dx-fe['x'])*0.22); cy=int(fe['y']+(dy-fe['y'])*0.22-12)
        cell(nid(), f'<b>{cf}</b>','text;html=1;align=center;verticalAlign=middle;resizable=0;points=[];autosize=1;strokeColor=none;fillColor=none;fontColor=#B85450;fontSize=10;fontStyle=1;',cx,cy,22,18)
    if ct:
        cx=int(te['x']+(dx-te['x'])*0.22); cy=int(te['y']+(dy-te['y'])*0.22-12)
        cell(nid(), f'<b>{ct}</b>','text;html=1;align=center;verticalAlign=middle;resizable=0;points=[];autosize=1;strokeColor=none;fillColor=none;fontColor=#B85450;fontSize=10;fontStyle=1;',cx,cy,22,18)

# Associative links
edge(nid(), 'e3', 'r5', 'endArrow=none;strokeColor=#B85450;strokeWidth=1;dashed=1;')

# Title
cell(nid(),'<font style="font-size:16px"><b>ORBITA — ER Diagram (Chen Notation)</b></font><br/><font style="font-size:10px">9 Entities · 4 Schemas · 7 Relationships</font>','text;html=1;align=center;verticalAlign=top;resizable=0;points=[];autosize=1;strokeColor=none;fillColor=none;',1200,15,500,44)

# Legend
lx,ly=60,18
cell(nid(),'<b>Legend:</b>','text;html=1;fontSize=9;fontStyle=1;fillColor=none;strokeColor=none;',lx,ly,55,16)
cell(nid(),'Entity','rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=8;',lx+58,ly,55,16)
cell(nid(),'Assoc','shape=process;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=8;backgroundOutline=1;size=0.08;',lx+118,ly,55,16)
cell(nid(),'<u><b>PK</b></u>','ellipse;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontSize=8;',lx+178,ly,36,16)
cell(nid(),'<i>FK</i>','ellipse;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;dashed=1;fontSize=8;',lx+219,ly,34,16)
cell(nid(),'Unique','ellipse;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;strokeWidth=2;fontSize=8;',lx+258,ly,42,16)
cell(nid(),'<i>/Deriv/</i>','ellipse;whiteSpace=wrap;html=1;fillColor=#f5f5f5;strokeColor=#999999;dashed=1;fontSize=8;',lx+305,ly,46,16)
cell(nid(),'Attr','ellipse;whiteSpace=wrap;html=1;fillColor=#f5f5f5;strokeColor=#666666;fontSize=8;',lx+356,ly,36,16)
cell(nid(),'Rel','rhombus;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;fontSize=8;fontStyle=1;',lx+397,ly-4,46,24)

xml = f'''<mxfile host="app.diagrams.net" type="device">
  <diagram id="orbita-er" name="ORBITA ER Diagram">
    <mxGraphModel dx="1422" dy="762" grid="1" gridSize="10" guides="1" tooltips="1"
      connect="1" arrows="1" fold="1" page="1" pageScale="1"
      pageWidth="4200" pageHeight="3200" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
{chr(10).join(cells)}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>'''

with open('/Users/anik/Code/ORBITA/docs/orbita-er-diagram.xml', 'w') as f:
    f.write(xml)
print(f"Generated {len(cells)} elements → orbita-er-diagram.xml")
