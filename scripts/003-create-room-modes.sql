-- Room modes table: tracks problematic frequencies across sessions
-- Used for learning venue-specific feedback patterns

CREATE TABLE IF NOT EXISTS room_modes (
  id TEXT PRIMARY KEY,
  frequency_hz DOUBLE PRECISION NOT NULL,
  -- Frequency band for grouping (rounds to nearest 10Hz)
  frequency_band INTEGER NOT NULL,
  -- Running statistics
  occurrence_count INTEGER DEFAULT 1,
  total_severity_score DOUBLE PRECISION DEFAULT 0,
  avg_amplitude_db DOUBLE PRECISION,
  avg_q_factor DOUBLE PRECISION,
  avg_prominence_db DOUBLE PRECISION,
  -- Most common classification
  primary_classification TEXT,
  -- Timestamps
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Link to sessions where this mode was detected
  session_ids TEXT[] DEFAULT '{}',
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Index for fast frequency band lookup
CREATE INDEX IF NOT EXISTS idx_room_modes_frequency_band ON room_modes(frequency_band);

-- Index for finding most problematic modes
CREATE INDEX IF NOT EXISTS idx_room_modes_occurrence ON room_modes(occurrence_count DESC);

-- Function to upsert a room mode observation
CREATE OR REPLACE FUNCTION upsert_room_mode(
  p_frequency_hz DOUBLE PRECISION,
  p_amplitude_db DOUBLE PRECISION,
  p_q_factor DOUBLE PRECISION,
  p_prominence_db DOUBLE PRECISION,
  p_classification TEXT,
  p_severity_score DOUBLE PRECISION,
  p_session_id TEXT
) RETURNS void AS $$
DECLARE
  v_band INTEGER;
  v_id TEXT;
BEGIN
  -- Round to nearest 10Hz band
  v_band := ROUND(p_frequency_hz / 10) * 10;
  v_id := 'rm_' || v_band::TEXT;
  
  INSERT INTO room_modes (
    id,
    frequency_hz,
    frequency_band,
    occurrence_count,
    total_severity_score,
    avg_amplitude_db,
    avg_q_factor,
    avg_prominence_db,
    primary_classification,
    first_seen_at,
    last_seen_at,
    session_ids
  ) VALUES (
    v_id,
    p_frequency_hz,
    v_band,
    1,
    p_severity_score,
    p_amplitude_db,
    p_q_factor,
    p_prominence_db,
    p_classification,
    NOW(),
    NOW(),
    ARRAY[p_session_id]
  )
  ON CONFLICT (id) DO UPDATE SET
    occurrence_count = room_modes.occurrence_count + 1,
    total_severity_score = room_modes.total_severity_score + p_severity_score,
    -- Running average for amplitude
    avg_amplitude_db = (room_modes.avg_amplitude_db * room_modes.occurrence_count + p_amplitude_db) / (room_modes.occurrence_count + 1),
    -- Running average for Q
    avg_q_factor = (room_modes.avg_q_factor * room_modes.occurrence_count + p_q_factor) / (room_modes.occurrence_count + 1),
    -- Running average for prominence
    avg_prominence_db = (room_modes.avg_prominence_db * room_modes.occurrence_count + p_prominence_db) / (room_modes.occurrence_count + 1),
    -- Update classification if more severe
    primary_classification = CASE 
      WHEN p_severity_score > (room_modes.total_severity_score / NULLIF(room_modes.occurrence_count, 0))
      THEN p_classification 
      ELSE room_modes.primary_classification 
    END,
    last_seen_at = NOW(),
    -- Add session to array if not already present
    session_ids = CASE 
      WHEN p_session_id = ANY(room_modes.session_ids) THEN room_modes.session_ids
      ELSE array_append(room_modes.session_ids, p_session_id)
    END;
END;
$$ LANGUAGE plpgsql;
