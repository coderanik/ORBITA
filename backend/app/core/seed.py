"""Idempotent database seeder — runs on startup for fresh databases."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

# All seed SQL statements (PostGIS-free, idempotent with ON CONFLICT)
SEED_STATEMENTS = [
    # ── Operators ──
    """INSERT INTO catalog.operator (name, short_name, country_code, operator_type, website, founded_year, headquarters) VALUES
    ('National Aeronautics and Space Administration','NASA','USA','GOVERNMENT','https://nasa.gov',1958,'Washington, D.C.'),
    ('SpaceX','SpaceX','USA','COMMERCIAL','https://spacex.com',2002,'Hawthorne, CA'),
    ('European Space Agency','ESA','EUR','INTERGOVERNMENTAL','https://esa.int',1975,'Paris, France'),
    ('Indian Space Research Organisation','ISRO','IND','GOVERNMENT','https://isro.gov.in',1969,'Bangalore, India'),
    ('Roscosmos','Roscosmos','RUS','GOVERNMENT','https://roscosmos.ru',1992,'Moscow, Russia'),
    ('Japan Aerospace Exploration Agency','JAXA','JPN','GOVERNMENT','https://jaxa.jp',2003,'Tokyo, Japan'),
    ('China Aerospace Science and Technology Corp','CASC','CHN','GOVERNMENT',NULL,1999,'Beijing, China'),
    ('Kongsberg Satellite Services','KSAT','NOR','COMMERCIAL','https://ksat.no',2002,'Tromsø, Norway'),
    ('Lockheed Martin','LMT','USA','COMMERCIAL','https://lockheedmartin.com',1995,'Bethesda, MD'),
    ('Northrop Grumman','NOC','USA','COMMERCIAL','https://northropgrumman.com',1994,'Falls Church, VA')
    ON CONFLICT DO NOTHING""",

    # ── Launch Vehicles ──
    """INSERT INTO catalog.launch_vehicle (name,family,variant,operator_id,country_code,num_stages,payload_leo_kg,payload_gto_kg,height_m,diameter_m,liftoff_mass_kg,status,maiden_flight) VALUES
    ('Falcon 9 Block 5','Falcon','Block 5',2,'USA',2,22800,8300,70.00,3.70,549054,'ACTIVE','2018-05-11'),
    ('Falcon Heavy','Falcon','Heavy',2,'USA',3,63800,26700,70.00,3.70,1420788,'ACTIVE','2018-02-06'),
    ('PSLV-XL','PSLV','XL',4,'IND',4,1750,1425,44.40,2.80,320000,'ACTIVE','2008-04-28'),
    ('Proton-M','Proton','M/Briz-M',5,'RUS',4,23000,6920,58.20,7.40,705000,'ACTIVE','2001-04-07'),
    ('Ariane 5 ECA','Ariane','5 ECA',3,'EUR',2,21000,10500,52.00,5.40,777000,'RETIRED','2002-12-11'),
    ('Soyuz-2.1b','Soyuz','2.1b',5,'RUS',3,8200,3250,46.30,2.95,312000,'ACTIVE','2006-12-27'),
    ('Long March 5B','Long March','5B',7,'CHN',2,25000,NULL,53.66,5.00,849000,'ACTIVE','2020-05-05')
    ON CONFLICT DO NOTHING""",

    # ── Launch Events ──
    """INSERT INTO catalog.launch_event (launch_date,vehicle_id,operator_id,launch_site,outcome,orbit_target,payload_count,flight_number) VALUES
    ('1998-11-20 06:40:00+00',4,5,'Baikonur Cosmodrome','SUCCESS','LEO',1,'Proton-K'),
    ('1990-04-24 12:33:51+00',NULL,1,'Kennedy Space Center LC-39B','SUCCESS','LEO',1,'STS-31'),
    ('2021-04-29 03:44:00+00',1,2,'Kennedy Space Center LC-39A','SUCCESS','LEO',60,'Falcon 9 B1060.7'),
    ('2021-12-25 12:20:00+00',5,3,'Guiana Space Centre ELA-3','SUCCESS','HEO',1,'VA256'),
    ('2023-07-14 09:05:00+00',3,4,'Satish Dhawan SDSC-SHAR','SUCCESS','HEO',1,'PSLV-C55'),
    ('2021-04-29 01:23:00+00',7,7,'Wenchang LC-101','SUCCESS','LEO',1,'CZ-5B Y2')
    ON CONFLICT DO NOTHING""",

    # ── Space Objects ──
    """INSERT INTO catalog.space_object (norad_id,cospar_id,name,object_type,operator_id,launch_id,launch_date,country_code,operator,orbit_class,status,mass_kg,purpose) VALUES
    (25544,'1998-067A','ISS (ZARYA)','SATELLITE',1,1,'1998-11-20','ISS','NASA/Roscosmos/ESA/JAXA/CSA','LEO','ACTIVE',420000,'Space Station'),
    (20580,'1990-037B','HST (HUBBLE)','SATELLITE',1,2,'1990-04-24','USA','NASA/ESA','LEO','ACTIVE',11110,'Astronomy'),
    (48274,'2021-036V','STARLINK-2636','SATELLITE',2,3,'2021-04-29','USA','SpaceX','LEO','ACTIVE',260,'Communications'),
    (48275,'2021-036W','STARLINK-2637','SATELLITE',2,3,'2021-04-29','USA','SpaceX','LEO','ACTIVE',260,'Communications'),
    (43226,'2018-029A','SENTINEL-3B','SATELLITE',3,NULL,'2018-04-25','EUR','ESA/EUMETSAT','SSO','ACTIVE',1250,'Earth Observation'),
    (49260,'2021-088A','JAMES WEBB SPACE TELESCOPE','SATELLITE',1,4,'2021-12-25','USA','NASA/ESA/CSA','HEO','ACTIVE',6161.4,'Astronomy'),
    (55909,'2023-028A','CHANDRAYAAN-3 MODULE','SATELLITE',4,5,'2023-07-14','IND','ISRO','HEO','ACTIVE',3900,'Lunar Exploration'),
    (27424,'2002-022A','AQUA','SATELLITE',1,NULL,'2002-05-04','USA','NASA','SSO','ACTIVE',2934,'Earth Science'),
    (37348,'2011-002A','ELEKTRO-L 1','SATELLITE',5,NULL,'2011-01-20','RUS','Roscosmos','GEO','ACTIVE',1620,'Meteorology'),
    (25994,'1999-025A','TERRA','SATELLITE',1,NULL,'1999-12-18','USA','NASA','SSO','ACTIVE',5190,'Earth Science'),
    (13552,'1982-092C','COSMOS 1408 DEB','DEBRIS',NULL,NULL,NULL,'RUS',NULL,'LEO','INACTIVE',NULL,NULL),
    (48078,'2021-016B','CZ-5B R/B','ROCKET_BODY',7,6,'2021-04-29','CHN','CASC','LEO','INACTIVE',21000,NULL),
    (40258,'2014-055B','BREEZE-M DEB','DEBRIS',NULL,NULL,NULL,'RUS',NULL,'HEO','INACTIVE',NULL,NULL),
    (26405,'2000-045B','TITAN 4B R/B','ROCKET_BODY',9,NULL,'2000-08-17','USA','Lockheed Martin','GEO','INACTIVE',3500,NULL),
    (43772,'2018-092B','FENGYUN 1C DEB','DEBRIS',NULL,NULL,NULL,'CHN',NULL,'LEO','INACTIVE',NULL,NULL)
    ON CONFLICT DO NOTHING""",

    # ── Orbit States ──
    """INSERT INTO tracking.orbit_state (object_id,epoch,position_x_km,position_y_km,position_z_km,velocity_x_km_s,velocity_y_km_s,velocity_z_km_s,reference_frame,semimajor_axis_km,eccentricity,inclination_deg,raan_deg,arg_perigee_deg,mean_anomaly_deg,mean_motion_rev_day,period_minutes,source) VALUES
    (1,'2026-02-09 00:00:00+00',-2497.638,4801.225,3757.948,-5.547,-3.874,3.186,'TEME',6793.5,0.0003456,51.6420,127.5432,45.2310,315.4200,15.49,92.95,'TLE'),
    (1,'2026-02-08 12:00:00+00',4122.890,-2801.445,4201.670,3.221,5.887,-2.945,'TEME',6793.3,0.0003410,51.6418,127.3200,44.9800,180.1200,15.49,92.95,'TLE'),
    (2,'2026-02-09 00:00:00+00',-5924.312,1543.881,2987.410,-2.134,-6.421,3.112,'TEME',6917.2,0.0002810,28.4712,215.8900,67.3400,292.7800,14.88,96.73,'TLE'),
    (3,'2026-02-09 00:00:00+00',3200.112,-4100.881,4320.550,5.102,2.340,-4.870,'TEME',6921.0,0.0001200,53.0540,180.2300,90.1200,45.6700,15.06,95.59,'TLE')
    ON CONFLICT DO NOTHING""",

    # ── Telemetry ──
    """INSERT INTO telemetry.satellite_telemetry (object_id,ts,subsystem,parameter_name,value,unit,quality) VALUES
    (1,'2026-02-09 00:00:00+00','EPS','solar_array_voltage',160.2,'V','NOMINAL'),
    (1,'2026-02-09 00:00:00+00','EPS','battery_charge',92.4,'%','NOMINAL'),
    (1,'2026-02-09 00:00:00+00','THERMAL','cabin_temperature',22.1,'C','NOMINAL'),
    (1,'2026-02-09 00:00:00+00','ADCS','attitude_roll',0.0012,'deg','NOMINAL'),
    (1,'2026-02-09 00:00:00+00','ADCS','attitude_pitch',-0.0034,'deg','NOMINAL'),
    (1,'2026-02-09 00:00:00+00','COMMS','downlink_signal_str',-68.3,'dBm','NOMINAL'),
    (2,'2026-02-09 00:00:00+00','EPS','solar_array_current',24.5,'A','NOMINAL'),
    (2,'2026-02-09 00:00:00+00','THERMAL','instrument_bay_temp',20.3,'C','NOMINAL'),
    (2,'2026-02-09 00:00:00+00','PAYLOAD','wfc3_status',1.0,'bool','NOMINAL'),
    (2,'2026-02-09 00:00:00+00','ADCS','pointing_error_arcsec',0.007,'arcsec','NOMINAL')
    ON CONFLICT DO NOTHING""",

    # ── Conjunction Events ──
    """INSERT INTO analytics.conjunction_event (primary_object_id,secondary_object_id,time_of_closest_approach,miss_distance_km,collision_probability,relative_velocity_km_s,risk_level,status) VALUES
    (1,11,'2026-02-11 14:23:00+00',0.85,2.3e-4,14.2,'HIGH','SCREENING'),
    (3,12,'2026-02-13 08:15:00+00',3.20,5.1e-6,10.8,'MEDIUM','PENDING'),
    (2,15,'2026-02-15 22:00:00+00',12.5,1.2e-7,7.5,'LOW','PENDING')
    ON CONFLICT DO NOTHING""",

    # ── Space Weather ──
    """INSERT INTO analytics.space_weather (ts,solar_flux_f10_7,kp_index,ap_index,dst_index,solar_wind_speed_km_s,geomagnetic_storm_level,data_source,is_forecast) VALUES
    ('2026-02-09 00:00:00+00',148.2,3.0,15,-12,420.0,'G0','NOAA_SWPC',FALSE),
    ('2026-02-08 21:00:00+00',147.8,2.7,12,-8,405.0,'G0','NOAA_SWPC',FALSE),
    ('2026-02-08 18:00:00+00',150.1,4.0,22,-25,510.0,'G1','NOAA_SWPC',FALSE)
    ON CONFLICT DO NOTHING""",

    # ── Missions ──
    """INSERT INTO catalog.mission (name,description,operator_id,operator,launch_date,status) VALUES
    ('ISS Operations','International Space Station continuous crewed operations',1,'NASA/Roscosmos/ESA/JAXA/CSA','1998-11-20','ACTIVE'),
    ('Hubble Servicing','Hubble Space Telescope observation mission',1,'NASA/ESA','1990-04-24','ACTIVE'),
    ('Starlink Gen2','SpaceX broadband constellation deployment',2,'SpaceX','2019-05-24','ACTIVE')
    ON CONFLICT DO NOTHING""",

    # ── Maneuver Log ──
    """INSERT INTO analytics.maneuver_log (object_id,conjunction_id,planned_time,delta_v_m_s,direction,status,notes) VALUES
    (1,1,'2026-02-11 10:00:00+00',0.5,'{"radial":0.0,"in_track":0.5,"cross_track":0.0}','PLANNED','Pre-emptive avoidance maneuver for ISS-Cosmos 1408 debris conjunction')
    ON CONFLICT DO NOTHING""",

    # ── Breakup Events ──
    """INSERT INTO analytics.breakup_event (parent_object_id,event_time,event_type,altitude_km,fragment_count,is_confirmed,source,notes) VALUES
    (11,'2021-11-15 02:00:00+00','DELIBERATE',480,1500,TRUE,'US Space Command','Russian ASAT test destroyed Cosmos 1408 satellite'),
    (15,'2007-01-11 00:00:00+00','DELIBERATE',865,3500,TRUE,'US Space Command','Chinese ASAT test destroyed Fengyun-1C weather satellite')
    ON CONFLICT DO NOTHING""",

    # ── Reentry Events ──
    """INSERT INTO analytics.reentry_event (object_id,predicted_time,actual_time,predicted_lat,predicted_lon,actual_lat,actual_lon,is_controlled,risk_level,surviving_mass_kg,status,source) VALUES
    (12,'2021-05-09 02:00:00+00','2021-05-09 02:24:00+00',28.6,72.5,28.59,72.47,FALSE,'HIGH',4000,'CONFIRMED','US Space Command'),
    (14,'2026-06-15 00:00:00+00',NULL,NULL,NULL,NULL,NULL,FALSE,'MEDIUM',800,'PREDICTED','ESA Space Debris Office')
    ON CONFLICT DO NOTHING""",

    # ── Anomaly Alerts ──
    """INSERT INTO ml.anomaly_alert (object_id,detected_at,subsystem,anomaly_type,severity,anomaly_score,threshold_used,model_version,description,window_start,window_end) VALUES
    (1,'2026-02-08 23:45:00+00','EPS','POWER_DROP','WARNING',0.87,0.65,'lstm-v1.2','Solar array voltage showing 3% deviation','2026-02-08 22:00:00+00','2026-02-08 23:45:00+00'),
    (2,'2026-02-09 01:00:00+00','THERMAL','THERMAL_EXCURSION','INFO',0.45,0.65,'lstm-v1.2','Minor instrument bay temperature fluctuation','2026-02-09 00:30:00+00','2026-02-09 01:00:00+00'),
    (3,'2026-02-08 18:00:00+00','ADCS','ATTITUDE_ERROR','CRITICAL',1.92,0.65,'lstm-v1.2','Starlink-2636 attitude control error exceeds 3-sigma','2026-02-08 17:00:00+00','2026-02-08 18:00:00+00')
    ON CONFLICT DO NOTHING""",

    # ── Debris Classifications ──
    """INSERT INTO ml.debris_classification (object_id,predicted_type,confidence,model_version,features_used,classified_at) VALUES
    (11,'DEBRIS',0.94,'rf-v2.1','{"semi_major_axis_km":6858,"eccentricity":0.005}','2026-02-09 00:00:00+00'),
    (13,'DEBRIS',0.88,'rf-v2.1','{"semi_major_axis_km":25000,"eccentricity":0.7}','2026-02-09 00:00:00+00'),
    (12,'ROCKET_BODY',0.97,'rf-v2.1','{"semi_major_axis_km":6800,"eccentricity":0.001}','2026-02-09 00:00:00+00'),
    (15,'DEBRIS',0.91,'rf-v2.1','{"semi_major_axis_km":7200,"eccentricity":0.003}','2026-02-09 00:00:00+00')
    ON CONFLICT DO NOTHING""",

    # ── Congestion Reports ──
    """INSERT INTO ml.congestion_report (analysis_time,altitude_min_km,altitude_max_km,inclination_min_deg,inclination_max_deg,object_count,density_objects_per_km3,risk_score,trend,cluster_count,model_version) VALUES
    ('2026-02-09 00:00:00+00',500,550,50,55,1842,2.8e-9,0.78,'INCREASING',12,'dbscan-v1.0'),
    ('2026-02-09 00:00:00+00',750,800,95,100,923,1.1e-9,0.52,'STABLE',6,'dbscan-v1.0'),
    ('2026-02-09 00:00:00+00',350,400,40,45,245,0.4e-9,0.21,'DECREASING',2,'dbscan-v1.0')
    ON CONFLICT DO NOTHING""",

    # ── ATSAD Benchmark Datasets ──
    """INSERT INTO ml.benchmark_dataset (name,description,task_type,domain,num_channels,num_data_points,num_anomalies,anomaly_ratio,source) VALUES
    ('ATSAD-SMAP-Uni','Soil Moisture Active Passive satellite - univariate','UNIVARIATE','SPACECRAFT',1,12000,340,0.028,'ATSADBench'),
    ('ATSAD-MSL-Uni','Mars Science Laboratory rover - univariate','UNIVARIATE','SPACECRAFT',1,8640,210,0.024,'ATSADBench'),
    ('ATSAD-SMAP-Multi','SMAP satellite - multivariate (25 channels)','MULTIVARIATE','SPACECRAFT',25,12000,340,0.028,'ATSADBench'),
    ('ATSAD-MSL-Multi','MSL rover - multivariate (55 channels)','MULTIVARIATE','SPACECRAFT',55,8640,210,0.024,'ATSADBench'),
    ('ATSAD-Power-Uni','Spacecraft power subsystem - univariate voltage','UNIVARIATE','SPACECRAFT',1,6000,150,0.025,'ATSADBench'),
    ('ATSAD-Thermal-Multi','Satellite thermal subsystem - multivariate','MULTIVARIATE','SPACECRAFT',12,9600,280,0.029,'ATSADBench'),
    ('ATSAD-ADCS-Multi','Attitude Determination & Control - multivariate','MULTIVARIATE','SPACECRAFT',9,7200,180,0.025,'ATSADBench'),
    ('ATSAD-Comm-Uni','Communication subsystem - univariate signal','UNIVARIATE','SPACECRAFT',1,5400,120,0.022,'ATSADBench'),
    ('ATSAD-Synthetic-Simple','Synthetic benchmark - simple periodic signals','UNIVARIATE','SIMULATED',1,10000,500,0.050,'ATSADBench')
    ON CONFLICT (name) DO NOTHING""",

    # ── ATSAD Benchmark Models ──
    """INSERT INTO ml.benchmark_model (name,model_type,architecture,version,description,context_strategy,is_baseline,hyperparameters) VALUES
    ('GPT-4o Zero-Shot','LLM','GPT-4o','v2024-08','OpenAI GPT-4o with zero-shot prompt','ZERO_SHOT',TRUE,'{"temperature":0.0,"max_tokens":512}'),
    ('GPT-4o Few-Shot','LLM','GPT-4o','v2024-08','GPT-4o with 5-shot examples','FEW_SHOT',TRUE,'{"temperature":0.0,"num_shots":5}'),
    ('LLaMA-3 70B Zero-Shot','LLM','LLaMA-3-70B','v3.0','Meta LLaMA-3 70B zero-shot','ZERO_SHOT',TRUE,'{"temperature":0.0}'),
    ('Isolation Forest','STATISTICAL','IsolationForest','v1.0','Scikit-learn Isolation Forest baseline',NULL,TRUE,'{"n_estimators":200}'),
    ('LSTM Autoencoder','DEEP_LEARNING','LSTM-AE','v1.0','LSTM autoencoder with reconstruction-error','ZERO_SHOT',TRUE,'{"hidden_size":64,"num_layers":2}'),
    ('Transformer AD','DEEP_LEARNING','TransformerEncoder','v1.0','Transformer encoder for multivariate AD',NULL,FALSE,'{"d_model":128,"nhead":8}'),
    ('ORBITA Hybrid v1','HYBRID','LLM+StatisticalEnsemble','v0.1','Novel ORBITA method: LLM + statistical ensemble','FEW_SHOT',FALSE,'{"llm_model":"GPT-4o"}')
    ON CONFLICT DO NOTHING""",
]


async def run_seed(session: AsyncSession) -> int:
    """Execute all seed statements. Returns count of successful statements."""
    success = 0
    for i, stmt in enumerate(SEED_STATEMENTS, 1):
        try:
            await session.execute(text(stmt))
            success += 1
        except Exception as exc:
            print(f"  [SEED] Statement {i} skipped: {exc}")
            await session.rollback()
    await session.commit()
    print(f"  [SEED] Completed: {success}/{len(SEED_STATEMENTS)} statements executed")
    return success
