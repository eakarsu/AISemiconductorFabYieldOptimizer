const pool = require('./database');

const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'operator',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Wafer defects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS wafer_defects (
        id SERIAL PRIMARY KEY,
        wafer_lot_id VARCHAR(100),
        defect_type VARCHAR(100),
        location_x FLOAT,
        location_y FLOAT,
        size_um FLOAT,
        severity VARCHAR(50),
        layer VARCHAR(100),
        process_step VARCHAR(255),
        image_url TEXT,
        description TEXT,
        detected_at TIMESTAMP DEFAULT NOW(),
        classified_by_ai BOOLEAN DEFAULT false,
        ai_confidence FLOAT,
        ai_classification_data TEXT,
        updated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Process parameters table
    await client.query(`
      CREATE TABLE IF NOT EXISTS process_parameters (
        id SERIAL PRIMARY KEY,
        recipe_id VARCHAR(100),
        parameter_name VARCHAR(255),
        target_value FLOAT,
        lower_limit FLOAT,
        upper_limit FLOAT,
        unit VARCHAR(50),
        process_step VARCHAR(255),
        equipment_id VARCHAR(100),
        measurement_frequency VARCHAR(100),
        updated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Yield predictions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS yield_predictions (
        id SERIAL PRIMARY KEY,
        wafer_lot_id VARCHAR(100),
        predicted_yield FLOAT,
        actual_yield FLOAT,
        model_version VARCHAR(50),
        prediction_type VARCHAR(100),
        confidence_interval_low FLOAT,
        confidence_interval_high FLOAT,
        features_used TEXT,
        predicted_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Root cause analyses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS root_cause_analyses (
        id SERIAL PRIMARY KEY,
        wafer_lot_id VARCHAR(100),
        failure_mode VARCHAR(255),
        root_cause TEXT,
        contributing_factors TEXT,
        corrective_action TEXT,
        preventive_action TEXT,
        severity VARCHAR(50),
        status VARCHAR(50) DEFAULT 'open',
        assigned_to VARCHAR(255),
        updated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Equipment matching table
    await client.query(`
      CREATE TABLE IF NOT EXISTS equipment_matching (
        id SERIAL PRIMARY KEY,
        equipment_id VARCHAR(100),
        process_step VARCHAR(255),
        compatibility_score FLOAT,
        qualification_status VARCHAR(100),
        last_qualified_date TIMESTAMP,
        performance_metrics TEXT,
        restrictions TEXT,
        updated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Defect patterns table
    await client.query(`
      CREATE TABLE IF NOT EXISTS defect_patterns (
        id SERIAL PRIMARY KEY,
        pattern_name VARCHAR(255),
        pattern_type VARCHAR(100),
        defect_count INTEGER,
        affected_area_percentage FLOAT,
        wafer_zone VARCHAR(100),
        process_step VARCHAR(255),
        equipment_id VARCHAR(100),
        signature TEXT,
        first_detected TIMESTAMP,
        description TEXT,
        updated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Wafer lots table
    await client.query(`
      CREATE TABLE IF NOT EXISTS wafer_lots (
        id SERIAL PRIMARY KEY,
        lot_number VARCHAR(100) UNIQUE,
        product_name VARCHAR(255),
        technology_node VARCHAR(100),
        wafer_count INTEGER,
        start_date TIMESTAMP,
        target_completion_date TIMESTAMP,
        priority VARCHAR(50),
        status VARCHAR(50) DEFAULT 'in_progress',
        customer VARCHAR(255),
        updated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Equipment inventory table
    await client.query(`
      CREATE TABLE IF NOT EXISTS equipment_inventory (
        id SERIAL PRIMARY KEY,
        equipment_name VARCHAR(255),
        equipment_type VARCHAR(100),
        manufacturer VARCHAR(255),
        model_number VARCHAR(255),
        serial_number VARCHAR(100) UNIQUE,
        location VARCHAR(255),
        bay VARCHAR(100),
        status VARCHAR(50) DEFAULT 'operational',
        installation_date TIMESTAMP,
        last_pm_date TIMESTAMP,
        next_pm_date TIMESTAMP,
        specifications TEXT,
        updated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Process recipes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS process_recipes (
        id SERIAL PRIMARY KEY,
        recipe_name VARCHAR(255) UNIQUE,
        process_type VARCHAR(100),
        technology_node VARCHAR(100),
        version VARCHAR(50),
        equipment_type VARCHAR(100),
        steps TEXT,
        parameters TEXT,
        approved_by VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        updated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Quality metrics table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quality_metrics (
        id SERIAL PRIMARY KEY,
        wafer_lot_id VARCHAR(100),
        metric_name VARCHAR(255),
        metric_value FLOAT,
        unit VARCHAR(50),
        target_value FLOAT,
        lower_spec_limit FLOAT,
        upper_spec_limit FLOAT,
        process_step VARCHAR(255),
        equipment_id VARCHAR(100),
        measurement_site VARCHAR(100),
        cpk FLOAT,
        cp FLOAT,
        measured_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Maintenance schedules table
    await client.query(`
      CREATE TABLE IF NOT EXISTS maintenance_schedules (
        id SERIAL PRIMARY KEY,
        equipment_id VARCHAR(100),
        maintenance_type VARCHAR(100),
        scheduled_date TIMESTAMP,
        estimated_duration_hours FLOAT,
        priority VARCHAR(50),
        description TEXT,
        assigned_technician VARCHAR(255),
        parts_required TEXT,
        status VARCHAR(50) DEFAULT 'scheduled',
        completed_date TIMESTAMP,
        actual_duration_hours FLOAT,
        notes TEXT,
        updated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // SPC alerts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS spc_alerts (
        id SERIAL PRIMARY KEY,
        equipment_id VARCHAR(100),
        parameter_name VARCHAR(255),
        rule_violated VARCHAR(255),
        current_value FLOAT,
        control_limit_upper FLOAT,
        control_limit_lower FLOAT,
        center_line FLOAT,
        severity VARCHAR(50),
        process_step VARCHAR(255),
        description TEXT,
        status VARCHAR(50) DEFAULT 'active',
        acknowledged_by VARCHAR(255),
        acknowledged_at TIMESTAMP,
        notes TEXT,
        triggered_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Facilities table (multi-tenancy)
    await client.query(`
      CREATE TABLE IF NOT EXISTS facilities (
        id SERIAL PRIMARY KEY,
        fab_name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        technology_nodes TEXT,
        capacity_wafers_per_month INTEGER,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP
      )
    `);

    // AI results persistence
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_results (
        id SERIAL PRIMARY KEY,
        endpoint VARCHAR(255),
        entity_type VARCHAR(100),
        entity_id INTEGER,
        user_id INTEGER,
        prompt_summary TEXT,
        result JSONB,
        model VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add fab_id to domain tables (safe migrations)
    const domainTables = [
      'wafer_defects', 'process_parameters', 'yield_predictions',
      'root_cause_analyses', 'equipment_matching', 'defect_patterns',
      'wafer_lots', 'equipment_inventory', 'process_recipes',
      'quality_metrics', 'maintenance_schedules', 'spc_alerts'
    ];
    for (const tbl of domainTables) {
      await client.query(`
        ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS fab_id INTEGER REFERENCES facilities(id) ON DELETE SET NULL
      `);
    }

    // Ensure ai_classification_data is JSONB
    await client.query(`
      ALTER TABLE wafer_defects
        ALTER COLUMN ai_classification_data TYPE TEXT
    `).catch(() => {}); // ignore if already correct type

    // Excursion war room results
    await client.query(`
      CREATE TABLE IF NOT EXISTS excursion_war_rooms (
        id SERIAL PRIMARY KEY,
        lot_id VARCHAR(100),
        cause_chain JSONB,
        suspect_tools JSONB,
        recommended_actions JSONB,
        ai_raw_response TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query('COMMIT');
    console.log('All database tables initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initializing database tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { initializeDatabase };
