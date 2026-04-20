-- Phase 1: High-Fidelity Physics Engine Tables

-- New table for high-fidelity propagation results
CREATE TABLE tracking.hifi_propagations (
    prop_id       BIGSERIAL PRIMARY KEY,
    object_id     INT REFERENCES catalog.space_objects(object_id),
    epoch         TIMESTAMPTZ NOT NULL,
    state_vector  DOUBLE PRECISION[6],    -- [x,y,z,vx,vy,vz] in km, km/s
    covariance    DOUBLE PRECISION[36],   -- 6x6 flattened covariance matrix, row-major
    force_model   JSONB,                  -- e.g., {"j2":true,"drag":true,"mass_kg":200}
    coord_frame   TEXT DEFAULT 'GCRS',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for temporal queries
CREATE INDEX idx_hifi_prop_epoch ON tracking.hifi_propagations(epoch);
CREATE INDEX idx_hifi_prop_obj ON tracking.hifi_propagations(object_id, epoch DESC);

-- CAM maneuver suggestions
CREATE TABLE analytics.cam_suggestions (
    cam_id        BIGSERIAL PRIMARY KEY,
    conjunction_id INT REFERENCES analytics.conjunction_events(conjunction_id),
    delta_v       DOUBLE PRECISION[3],   -- km/s in RTN (Radial, Transverse, Normal)
    burn_epoch    TIMESTAMPTZ,
    fuel_kg       DOUBLE PRECISION,
    miss_distance_after_km DOUBLE PRECISION,
    pc_before     DOUBLE PRECISION,
    pc_after      DOUBLE PRECISION,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cam_conj ON analytics.cam_suggestions(conjunction_id);
