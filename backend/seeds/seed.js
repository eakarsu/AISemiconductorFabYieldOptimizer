const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { initializeDatabase } = require('../config/schema');

async function seed() {
  const client = await pool.connect();

  try {
    console.log('Initializing database schema...');
    await initializeDatabase();

    console.log('Clearing existing data...');
    await client.query(`
      TRUNCATE TABLE
        spc_alerts,
        maintenance_schedules,
        quality_metrics,
        process_recipes,
        defect_patterns,
        equipment_matching,
        root_cause_analyses,
        yield_predictions,
        process_parameters,
        wafer_defects,
        wafer_lots,
        equipment_inventory,
        users
      CASCADE;
    `);

    // ---------------------------------------------------------------
    // 1. Users
    // ---------------------------------------------------------------
    console.log('Seeding users...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    await client.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1, $2, $3, $4)`,
      ['admin', 'admin@semiconfab.com', hashedPassword, 'admin']
    );

    // ---------------------------------------------------------------
    // 2. Equipment Inventory (15 items)
    // ---------------------------------------------------------------
    console.log('Seeding equipment_inventory...');
    const serialNumbers = [
      'AMAT-PVD-001', 'LAM-ETCH-001', 'ASML-LITHO-001', 'TEL-TRACK-001', 'AMAT-CVD-001',
      'KLA-INSP-001', 'HIT-SEM-001', 'AMAT-IMP-001', 'AXC-IMP-001', 'EBR-CMP-001',
      'DNS-WET-001', 'KOK-FURN-001', 'LAM-ETCH-002', 'AMAT-CMP-001', 'KLA-MET-001'
    ];

    const equipmentData = [
      ['AMAT Endura PVD', 'PVD', 'Applied Materials', 'Endura', serialNumbers[0], 'Fab 1 Clean Room', 'Bay 1', 'operational', '2022-03-15', '2024-09-15', '2025-03-15', JSON.stringify({chambers: 5, max_wafer_size: '300mm', base_pressure: '1e-8 torr', targets: ['Ti', 'TiN', 'Al-Cu', 'Ta', 'TaN']})],
      ['LAM 2300 Etch', 'Dry Etch', 'Lam Research', '2300 Exelan Flex', serialNumbers[1], 'Fab 1 Clean Room', 'Bay 2', 'operational', '2021-06-20', '2024-10-01', '2025-04-01', JSON.stringify({chambers: 4, etch_type: 'conductor', gases: ['Cl2', 'HBr', 'CF4', 'O2', 'Ar'], endpoint: 'OES'})],
      ['ASML TWINSCAN NXE:3600', 'EUV Lithography', 'ASML', 'TWINSCAN NXE:3600', serialNumbers[2], 'Fab 1 Clean Room', 'Bay 3', 'operational', '2023-01-10', '2024-11-01', '2025-05-01', JSON.stringify({wavelength_nm: 13.5, NA: 0.33, resolution_nm: 13, throughput_wph: 160, overlay_nm: 1.2})],
      ['TEL CLEAN TRACK ACT12', 'Coat/Develop Track', 'Tokyo Electron', 'CLEAN TRACK ACT12', serialNumbers[3], 'Fab 1 Clean Room', 'Bay 3', 'operational', '2022-05-18', '2024-09-20', '2025-03-20', JSON.stringify({modules: 12, coat_uniformity: '< 1%', develop_uniformity: '< 0.5%', throughput_wph: 250})],
      ['Applied Producer CVD', 'CVD', 'Applied Materials', 'Producer GT', serialNumbers[4], 'Fab 1 Clean Room', 'Bay 4', 'operational', '2021-11-05', '2024-10-10', '2025-04-10', JSON.stringify({chambers: 2, films: ['SiO2', 'SiN', 'SiON', 'USG', 'BPSG'], temp_range: '200-800C', pressure_range: '0.1-10 torr'})],
      ['KLA Puma 9xx', 'Optical Inspection', 'KLA Corporation', 'Puma 9950', serialNumbers[5], 'Fab 1 Clean Room', 'Bay 5', 'operational', '2022-08-12', '2024-10-15', '2025-04-15', JSON.stringify({pixel_size_nm: 50, sensitivity: 'sub-30nm particles', throughput_wph: 120, darkfield: true, brightfield: true})],
      ['Hitachi SU9000 SEM', 'SEM Review', 'Hitachi High-Tech', 'SU9000', serialNumbers[6], 'Fab 1 Clean Room', 'Bay 5', 'operational', '2022-02-28', '2024-08-25', '2025-02-25', JSON.stringify({resolution_nm: 0.4, voltage_range: '0.5-30kV', magnification: '100x-2000000x', detectors: ['SE', 'BSE', 'STEM']})],
      ['AMAT Centura Implant', 'Ion Implantation', 'Applied Materials', 'Centura', serialNumbers[7], 'Fab 1 Clean Room', 'Bay 6', 'maintenance', '2021-09-22', '2024-10-18', '2025-04-18', JSON.stringify({energy_range: '0.2-200 keV', species: ['B', 'P', 'As', 'BF2', 'Ge'], beam_current: 'up to 25mA', angle_range: '0-60 deg'})],
      ['Axcelis Purion H', 'High Current Implant', 'Axcelis Technologies', 'Purion H', serialNumbers[8], 'Fab 1 Clean Room', 'Bay 6', 'operational', '2022-07-14', '2024-11-01', '2025-05-01', JSON.stringify({energy_range: '2-200 keV', beam_current: 'up to 75mA', dose_range: '1e11-1e16 cm-2', productivity_wph: 200})],
      ['Ebara FREX 300S CMP', 'CMP', 'Ebara Corporation', 'FREX 300S', serialNumbers[9], 'Fab 1 Clean Room', 'Bay 7', 'operational', '2022-04-30', '2024-09-05', '2025-03-05', JSON.stringify({platens: 3, heads: 4, slurry_systems: 3, max_pressure_psi: 7, pad_conditioning: 'in-situ'})],
      ['DNS SU-3200 Wet Station', 'Wet Clean', 'DNS (Screen)', 'SU-3200', serialNumbers[10], 'Fab 1 Clean Room', 'Bay 7', 'operational', '2021-12-15', '2024-10-30', '2025-04-30', JSON.stringify({baths: 8, chemistries: ['SC1', 'SC2', 'HF', 'SPM', 'APM', 'HPM'], drying: 'IPA Marangoni', throughput_wph: 180})],
      ['Kokusai Vertron Furnace', 'Diffusion Furnace', 'Kokusai Electric', 'Vertron V', serialNumbers[11], 'Fab 1 Clean Room', 'Bay 8', 'operational', '2021-07-20', '2024-07-15', '2025-01-15', JSON.stringify({temp_range: '400-1200C', tube_count: 4, batch_size: 150, processes: ['oxidation', 'LPCVD', 'anneal', 'nitridation'], uniformity: '< 0.5C'})],
      ['Lam Versys Kiyo Etch', 'Dry Etch', 'Lam Research', 'Versys Kiyo', serialNumbers[12], 'Fab 1 Clean Room', 'Bay 2', 'operational', '2022-09-10', '2024-11-05', '2025-05-05', JSON.stringify({chambers: 2, etch_type: 'dielectric', gases: ['CHF3', 'CF4', 'C4F8', 'O2', 'Ar', 'N2'], endpoint: 'OES + interferometry'})],
      ['AMAT Mirra CMP', 'CMP', 'Applied Materials', 'Mirra Mesa', serialNumbers[13], 'Fab 1 Clean Room', 'Bay 7', 'idle', '2020-11-08', '2024-08-12', '2025-02-12', JSON.stringify({platens: 3, heads: 5, polishing_type: 'rotational', endpoint: 'motor current + optical', max_removal_rate: '800 nm/min'})],
      ['KLA SpectraShape 11k', 'OCD Metrology', 'KLA Corporation', 'SpectraShape 11k', serialNumbers[14], 'Fab 1 Clean Room', 'Bay 5', 'operational', '2023-03-01', '2024-12-05', '2025-06-05', JSON.stringify({spectral_range: '190-900nm', measurement_spots: 49, repeatability: '< 0.02nm', throughput_wph: 80, parameters: ['CD', 'SWA', 'height', 'pitch']})],
    ];

    for (const eq of equipmentData) {
      await client.query(
        `INSERT INTO equipment_inventory
           (equipment_name, equipment_type, manufacturer, model_number, serial_number, location, bay, status, installation_date, last_pm_date, next_pm_date, specifications)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        eq
      );
    }

    // ---------------------------------------------------------------
    // 3. Wafer Lots (15 items)
    // ---------------------------------------------------------------
    console.log('Seeding wafer_lots...');
    const lotNumbers = [
      'LOT-2024-001', 'LOT-2024-002', 'LOT-2024-003', 'LOT-2024-004', 'LOT-2024-005',
      'LOT-2024-006', 'LOT-2024-007', 'LOT-2024-008', 'LOT-2024-009', 'LOT-2024-010',
      'LOT-2024-011', 'LOT-2024-012', 'LOT-2024-013', 'LOT-2024-014', 'LOT-2024-015'
    ];

    const lotsData = [
      [lotNumbers[0], 'Advanced Logic 7nm', '7nm', 25, '2024-10-01', '2024-12-15', 'critical', 'in_progress', 'TechCorp Global'],
      [lotNumbers[1], 'Memory NAND 128L', '128L', 50, '2024-10-05', '2024-12-20', 'high', 'in_progress', 'MemoryWorks Inc'],
      [lotNumbers[2], 'RF SiGe BiCMOS', '130nm', 25, '2024-09-15', '2024-11-20', 'medium', 'completed', 'RF Dynamics'],
      [lotNumbers[3], 'Power MOSFET', '100nm', 50, '2024-10-10', '2024-12-25', 'high', 'in_progress', 'PowerSemi Ltd'],
      [lotNumbers[4], 'MEMS Sensor', '180nm', 100, '2024-10-20', '2025-01-10', 'medium', 'queued', 'SensorTech AG'],
      [lotNumbers[5], 'CMOS Image Sensor', '65nm', 25, '2024-10-02', '2024-12-18', 'critical', 'in_progress', 'VisionChip Co'],
      [lotNumbers[6], 'Analog Mixed Signal', '28nm', 50, '2024-09-01', '2024-11-05', 'medium', 'completed', 'AnalogPro Inc'],
      [lotNumbers[7], 'Automotive MCU', '40nm', 50, '2024-10-08', '2024-12-22', 'high', 'in_progress', 'AutoDrive Systems'],
      [lotNumbers[8], 'GaN HEMT', '250nm', 25, '2024-10-12', '2024-12-30', 'high', 'in_progress', 'GaN Power Solutions'],
      [lotNumbers[9], 'SiC Schottky', '350nm', 25, '2024-10-25', '2025-01-15', 'medium', 'queued', 'WBG Devices Corp'],
      [lotNumbers[10], 'FinFET 5nm', '5nm', 25, '2024-10-03', '2024-12-16', 'critical', 'in_progress', 'TechCorp Global'],
      [lotNumbers[11], 'DRAM DDR5', '10nm', 50, '2024-10-07', '2024-12-21', 'high', 'in_progress', 'MemoryWorks Inc'],
      [lotNumbers[12], 'BCD Process', '180nm', 100, '2024-08-20', '2024-10-30', 'low', 'completed', 'PowerSemi Ltd'],
      [lotNumbers[13], 'SOI RF Switch', '45nm', 25, '2024-10-15', '2024-12-28', 'medium', 'in_progress', 'RF Dynamics'],
      [lotNumbers[14], 'eFlash NOR', '55nm', 50, '2024-10-28', '2025-01-20', 'low', 'queued', 'FlashStore Inc'],
    ];

    for (const lot of lotsData) {
      await client.query(
        `INSERT INTO wafer_lots
           (lot_number, product_name, technology_node, wafer_count, start_date, target_completion_date, priority, status, customer)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        lot
      );
    }

    // ---------------------------------------------------------------
    // 4. Wafer Defects (15 items)
    // ---------------------------------------------------------------
    console.log('Seeding wafer_defects...');
    const defectsData = [
      [lotNumbers[0], 'particle_contamination', 125.4, 87.2, 0.35, 'medium', 'Metal1', 'PVD Deposition', null, 'Particle found on Metal1 layer after PVD deposition', '2024-10-15 08:30:00'],
      [lotNumbers[0], 'scratch', 45.0, 150.0, 12.50, 'high', 'Poly', 'CMP Polish', null, 'Linear scratch across polysilicon after CMP', '2024-10-16 10:15:00'],
      [lotNumbers[1], 'pattern_defect', 200.1, 45.8, 0.18, 'critical', 'Gate', 'Lithography', null, 'Bridging between gate features due to focus error', '2024-10-18 14:20:00'],
      [lotNumbers[1], 'void', 88.6, 110.3, 0.42, 'high', 'Metal2', 'CVD Deposition', null, 'Void in Metal2 fill causing open circuit risk', '2024-10-19 09:45:00'],
      [lotNumbers[2], 'bridging', 156.7, 72.1, 0.25, 'critical', 'Metal1', 'Etch', null, 'Metal bridging between adjacent lines', '2024-10-05 11:30:00'],
      [lotNumbers[3], 'residue', 30.2, 200.5, 1.80, 'low', 'STI', 'Wet Clean', null, 'Post-etch polymer residue on STI surface', '2024-10-22 07:50:00'],
      [lotNumbers[5], 'film_peeling', 175.3, 130.9, 3.20, 'high', 'ILD', 'CVD Deposition', null, 'Interlayer dielectric peeling due to adhesion failure', '2024-10-20 13:10:00'],
      [lotNumbers[5], 'overlay_shift', 100.0, 100.0, 0.08, 'critical', 'Gate', 'Lithography', null, 'Overlay misalignment exceeding 5nm spec on gate layer', '2024-10-21 08:25:00'],
      [lotNumbers[7], 'cd_variation', 140.5, 60.4, 0.12, 'medium', 'Poly', 'Etch', null, 'Critical dimension variation across wafer exceeding 3sigma', '2024-10-23 15:40:00'],
      [lotNumbers[8], 'etch_pit', 67.8, 180.2, 0.55, 'medium', 'STI', 'Etch', null, 'Etch pit formed during STI trench etch', '2024-10-25 10:20:00'],
      [lotNumbers[10], 'staining', 210.0, 25.0, 5.00, 'low', 'Metal2', 'Wet Clean', null, 'Water stain marks visible on Metal2 surface', '2024-10-17 16:05:00'],
      [lotNumbers[10], 'crystal_defect', 95.3, 95.3, 0.02, 'high', 'Substrate', 'Epitaxy', null, 'Threading dislocation propagating from substrate', '2024-10-18 09:30:00'],
      [lotNumbers[11], 'metal_contamination', 180.0, 55.7, 0.10, 'critical', 'Metal1', 'PVD Deposition', null, 'Cu contamination detected on Metal1 Al lines', '2024-10-20 11:55:00'],
      [lotNumbers[3], 'gate_oxide_defect', 110.2, 140.8, 0.06, 'critical', 'Gate', 'Oxidation', null, 'Gate oxide pinhole causing premature breakdown', '2024-10-24 14:15:00'],
      [lotNumbers[13], 'contact_open', 55.9, 165.4, 0.20, 'high', 'Contact', 'Etch', null, 'Contact via not fully opened due to etch stop', '2024-10-26 08:40:00'],
    ];

    for (const d of defectsData) {
      await client.query(
        `INSERT INTO wafer_defects
           (wafer_lot_id, defect_type, location_x, location_y, size_um, severity, layer, process_step, image_url, description, detected_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        d
      );
    }

    // ---------------------------------------------------------------
    // 5. Process Parameters (15 items)
    // ---------------------------------------------------------------
    console.log('Seeding process_parameters...');
    const processParamsData = [
      ['RCP-CVD-001', 'Chamber Temperature', 400.0, 395.0, 405.0, 'celsius', 'CVD Deposition', serialNumbers[4], 'every_wafer'],
      ['RCP-ETCH-001', 'RF Power', 300.0, 280.0, 320.0, 'watts', 'Poly Etch', serialNumbers[1], 'every_wafer'],
      ['RCP-ETCH-001', 'Gas Flow Rate CF4', 50.0, 45.0, 55.0, 'sccm', 'Poly Etch', serialNumbers[1], 'every_wafer'],
      ['RCP-ETCH-002', 'Gas Flow Rate O2', 20.0, 18.0, 22.0, 'sccm', 'Spacer Etch', serialNumbers[12], 'every_lot'],
      ['RCP-CVD-001', 'Chamber Pressure', 4.0, 3.5, 4.5, 'torr', 'CVD Deposition', serialNumbers[4], 'every_wafer'],
      ['RCP-PVD-001', 'Bias Voltage', -150.0, -160.0, -140.0, 'volts', 'PVD Deposition', serialNumbers[0], 'every_lot'],
      ['RCP-CVD-002', 'Deposition Rate', 120.0, 110.0, 130.0, 'angstrom/min', 'HDPCVD Fill', serialNumbers[4], 'every_5_wafers'],
      ['RCP-ETCH-001', 'Etch Rate', 3000.0, 2700.0, 3300.0, 'angstrom/min', 'Poly Etch', serialNumbers[1], 'every_lot'],
      ['RCP-COAT-001', 'Spin Speed', 3000.0, 2900.0, 3100.0, 'rpm', 'Resist Coat', serialNumbers[3], 'every_wafer'],
      ['RCP-COAT-001', 'Bake Temperature', 110.0, 108.0, 112.0, 'celsius', 'Post-Exposure Bake', serialNumbers[3], 'every_wafer'],
      ['RCP-LITHO-001', 'Exposure Dose', 32.0, 30.0, 34.0, 'mJ/cm2', 'EUV Lithography', serialNumbers[2], 'every_wafer'],
      ['RCP-LITHO-001', 'Focus Offset', 0.0, -0.05, 0.05, 'um', 'EUV Lithography', serialNumbers[2], 'every_wafer'],
      ['RCP-CMP-001', 'CMP Pressure', 4.0, 3.5, 4.5, 'psi', 'CMP Polish', serialNumbers[9], 'every_wafer'],
      ['RCP-CMP-001', 'Slurry Flow Rate', 200.0, 180.0, 220.0, 'ml/min', 'CMP Polish', serialNumbers[9], 'every_lot'],
      ['RCP-IMP-001', 'Implant Energy', 40.0, 38.0, 45.0, 'keV', 'Ion Implantation', serialNumbers[8], 'every_lot'],
    ];

    for (const p of processParamsData) {
      await client.query(
        `INSERT INTO process_parameters
           (recipe_id, parameter_name, target_value, lower_limit, upper_limit, unit, process_step, equipment_id, measurement_frequency)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        p
      );
    }

    // ---------------------------------------------------------------
    // 6. Yield Predictions (15 items)
    // ---------------------------------------------------------------
    console.log('Seeding yield_predictions...');
    const yieldPredData = [
      [lotNumbers[0], 92.5, 91.8, 'v2.3.1', 'statistical', 90.0, 95.0, JSON.stringify({defect_density: 0.15, overlay: 'nominal', cd_uniformity: 'good'}), '2024-10-15'],
      [lotNumbers[1], 88.3, 87.1, 'v2.3.1', 'ml_model', 85.0, 92.0, JSON.stringify({etch_uniformity: 'marginal', selectivity: 'good', profile: 'nominal'}), '2024-10-18'],
      [lotNumbers[2], 95.2, 95.8, 'v2.3.1', 'hybrid', 93.0, 97.0, JSON.stringify({film_thickness: 'tight', stress: 'low', particle_count: 2}), '2024-10-05'],
      [lotNumbers[3], 90.1, 89.5, 'v2.3.1', 'ml_model', 87.0, 93.0, JSON.stringify({dose_uniformity: 'good', energy_stability: 'nominal', angle: 'within_spec'}), '2024-10-22'],
      [lotNumbers[4], 96.8, null, 'v2.3.1', 'statistical', 94.0, 98.0, JSON.stringify({thickness_uniformity: 'excellent', growth_rate: 'stable'}), '2024-10-20'],
      [lotNumbers[5], 85.4, 83.9, 'v2.3.1', 'hybrid', 82.0, 89.0, JSON.stringify({overlay_error: 0.8, focus_offset: -0.015, resist_profile: 'marginal'}), '2024-10-21'],
      [lotNumbers[6], 93.7, 94.2, 'v2.2.0', 'statistical', 91.0, 96.0, JSON.stringify({removal_rate: 'stable', non_uniformity: 3.2, dishing: 'minimal'}), '2024-09-28'],
      [lotNumbers[7], 91.0, 90.3, 'v2.3.1', 'ml_model', 88.0, 94.0, JSON.stringify({cd_bias: 2.1, profile_angle: 88.5, residue: 'none'}), '2024-10-23'],
      [lotNumbers[8], 87.6, 86.2, 'v2.3.1', 'hybrid', 84.0, 91.0, JSON.stringify({step_coverage: 'marginal', grain_size: 'large', resistivity: 'high'}), '2024-10-25'],
      [lotNumbers[9], 97.3, null, 'v2.3.1', 'statistical', 95.0, 98.5, JSON.stringify({oxide_quality: 'excellent', interface_charge: 'low'}), '2024-10-25'],
      [lotNumbers[10], 82.1, 80.5, 'v2.3.1', 'ml_model', 78.0, 86.0, JSON.stringify({defect_density: 0.42, pattern_collapse: 'observed', exposure_latitude: 'tight'}), '2024-10-17'],
      [lotNumbers[11], 89.8, 88.4, 'v2.3.1', 'hybrid', 86.0, 93.0, JSON.stringify({erosion: 'moderate', scratch_count: 3, planarity: 'acceptable'}), '2024-10-20'],
      [lotNumbers[12], 94.5, 94.9, 'v2.2.0', 'statistical', 92.0, 97.0, JSON.stringify({junction_depth: 'on_target', sheet_resistance: 'within_spec'}), '2024-09-15'],
      [lotNumbers[13], 91.2, 90.8, 'v2.3.1', 'ml_model', 88.0, 94.0, JSON.stringify({film_composition: 'nominal', adhesion: 'good', uniformity: 2.8}), '2024-10-26'],
      [lotNumbers[14], 93.0, null, 'v2.3.1', 'hybrid', 90.0, 96.0, JSON.stringify({selectivity: 'high', loading_effect: 'minimal', endpoint: 'clear'}), '2024-10-28'],
    ];

    for (const y of yieldPredData) {
      await client.query(
        `INSERT INTO yield_predictions
           (wafer_lot_id, predicted_yield, actual_yield, model_version, prediction_type, confidence_interval_low, confidence_interval_high, features_used, predicted_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        y
      );
    }

    // ---------------------------------------------------------------
    // 7. Root Cause Analyses (15 items)
    // ---------------------------------------------------------------
    console.log('Seeding root_cause_analyses...');
    const rcaData = [
      [lotNumbers[0], 'Particle Contamination in Metal1', 'HEPA filter degradation in PVD chamber allowing particles to reach wafer surface during deposition', 'Robot arm particle shedding combined with inadequate chamber seasoning after maintenance', 'Replace HEPA filters and increase chamber seasoning wafers from 2 to 5', 'Implement monthly HEPA filter integrity checks and automated chamber particle qualification', 'high', 'confirmed', 'John Park'],
      [lotNumbers[5], 'Overlay Misalignment on Gate Layer', 'Stage calibration drift in ASML scanner causing systematic X-offset of 3.2nm', 'Wafer chuck contamination and alignment mark asymmetry contributing to measurement error', 'Recalibrate stage servos and perform full baseline correction', 'Schedule weekly stage calibration verification and implement real-time drift monitoring', 'critical', 'confirmed', 'Mike Tanaka'],
      [lotNumbers[1], 'Etch Undercut in Poly Gate', 'Excessive lateral etch due to degraded chamber wall passivation', 'Resist erosion during over-etch step and endpoint detection delay of 2.5 seconds', 'Reduce over-etch time by 10% and re-passivate chamber walls', 'Implement advanced endpoint algorithm with faster response and tighter CD-SEM monitoring', 'high', 'investigating', 'Sarah Chen'],
      [lotNumbers[8], 'Film Stress Causing Wafer Bow', 'Excessive compressive stress in PECVD SiN film due to RF power drift', 'Temperature ramp rate too fast at 15C/min and NH3/SiH4 ratio imbalance', 'Adjust SiH4/NH3 ratio from 1:4 to 1:3.5 and reduce ramp to 5C/min', 'Install real-time stress monitor and add automatic RF power compensation', 'medium', 'confirmed', 'David Kim'],
      [lotNumbers[2], 'Electromigration Failure in Metal2', 'Bamboo grain structure in Cu interconnect causing preferential diffusion path', 'Current density exceeding 2MA/cm2 at via bottoms and insufficient TaN barrier coverage', 'Increase TaN barrier to 50A and optimize Cu seed grain orientation', 'Update design rules for max current density and implement barrier thickness monitoring', 'high', 'resolved', 'Lisa Wong'],
      [lotNumbers[3], 'Gate Oxide Breakdown', 'Plasma-induced damage during gate etch causing oxide thinning at poly corners', 'Mobile ion contamination from furnace tube and oxide thinning at corners below 3nm', 'Add protective oxide step during gate etch and verify furnace tube cleanliness', 'Implement charge-damage monitoring test structures and quarterly furnace qualification', 'critical', 'investigating', 'Anna Petrov'],
      [lotNumbers[10], 'Junction Leakage in NMOS', 'Implant channeling through crystalline silicon causing deeper-than-expected junction', 'Insufficient pre-amorphization implant dose and thermal budget exceedance during anneal', 'Increase PAI dose by 15% and reduce RTA spike temperature by 5C', 'Add SIMS profile verification at lot start and implement thermal budget tracking system', 'high', 'confirmed', 'James Lee'],
      [lotNumbers[13], 'High Contact Resistance', 'Incomplete TiSi2 formation due to native oxide at Si/Ti interface', 'Insufficient pre-clean in wet station and Ti liner discontinuity at via sidewall', 'Add in-situ Ar sputter clean before Ti deposition and optimize silicide anneal', 'Reduce queue time between clean and PVD to under 30 minutes and add resistance monitoring', 'medium', 'investigating', 'Kevin Zhao'],
      [lotNumbers[6], 'Metal Void in Via', 'Cu seed coverage gap at high aspect ratio via bottom causing ECD void', 'ECD bath additive depletion after 5000 wafer throughput and AR exceeding 6:1', 'Optimize PVD re-sputter step coverage and refresh ECD bath chemistry', 'Implement automatic bath chemistry monitoring and consider via size relaxation', 'high', 'resolved', 'Rachel Ng'],
      [lotNumbers[11], 'CMP Dishing in Wide Metal Lines', 'Insufficient slurry selectivity between Cu and barrier causing over-polish', 'Pattern density variation from 20% to 80% across die and endpoint overshoot', 'Switch to high-selectivity slurry and add dummy fill to low-density areas', 'Tune endpoint with 5% under-polish margin and implement post-CMP thickness map', 'medium', 'confirmed', 'Rachel Ng'],
      [lotNumbers[10], 'Pattern Collapse After Develop', 'High aspect ratio resist features exceeding 8:1 collapsing during rinse step', 'Surface tension during DI water rinse and resist adhesion loss from HMDS degradation', 'Switch to surfactant rinse and evaluate freeze-dry technique', 'Increase HMDS prime temperature and implement aspect-ratio-aware rinse recipe', 'high', 'investigating', 'Lisa Wong'],
      [lotNumbers[10], 'Implant Shadowing on Fin Structures', 'Tilt angle insufficient for 28nm fin pitch causing dose non-uniformity', 'Wafer rotation motor accuracy degradation and beam divergence increase', 'Increase quad tilt to 28 degrees and verify rotation motor calibration', 'Schedule monthly beam profile verification and implement dose uniformity monitoring', 'medium', 'confirmed', 'James Lee'],
      [lotNumbers[12], 'Thermal Budget Exceedance', 'Cumulative anneal effect exceeding design thermal budget by 8%', 'Furnace temperature overshoot of 5C during ramp and extra unplanned rework anneal', 'Revise thermal budget tracking and calibrate furnace PID controller', 'Implement real-time thermal budget calculator in MES and replace degraded thermocouple', 'low', 'resolved', 'Mary Sato'],
      [lotNumbers[7], 'Photoresist Scumming', 'Insufficient exposure dose leaving residual resist in trenches', 'Developer concentration 2% below target and PEB hotplate temperature drift of 1.5C', 'Increase exposure dose by 2mJ/cm2 and replace developer solution', 'Calibrate PEB hotplate weekly and implement developer concentration monitoring', 'medium', 'investigating', 'Tom Huang'],
      [lotNumbers[13], 'Via Open Defect', 'Etch stop on TaN barrier layer at via bottom due to insufficient over-etch', 'Polymer residue in via bottom and slight misalignment to lower metal level', 'Add over-etch step with higher bias power and implement post-etch ash clean', 'Tighten overlay spec to 3nm and add via resistance test structure monitoring', 'high', 'investigating', 'Sarah Chen'],
    ];

    for (const r of rcaData) {
      await client.query(
        `INSERT INTO root_cause_analyses
           (wafer_lot_id, failure_mode, root_cause, contributing_factors, corrective_action, preventive_action, severity, status, assigned_to)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        r
      );
    }

    // ---------------------------------------------------------------
    // 8. Equipment Matching (15 items)
    // ---------------------------------------------------------------
    console.log('Seeding equipment_matching...');
    const eqMatchData = [
      [serialNumbers[4], 'CVD Deposition', 92.0, 'qualified', '2024-09-15', JSON.stringify({throughput_wph: 25, uniformity_pct: 1.2, particle_adder: 3, uptime_pct: 95}), JSON.stringify({max_wafer_count: 50000, excluded_recipes: []})],
      [serialNumbers[0], 'PVD Deposition', 88.5, 'qualified', '2024-08-20', JSON.stringify({throughput_wph: 30, film_uniformity_pct: 1.5, step_coverage_pct: 85, uptime_pct: 92}), JSON.stringify({max_wafer_count: 40000, excluded_recipes: ['RCP-PVD-003']})],
      [serialNumbers[1], 'Poly Etch', 95.0, 'qualified', '2024-10-01', JSON.stringify({throughput_wph: 40, cd_uniformity_nm: 1.2, selectivity: 50, uptime_pct: 96}), JSON.stringify({max_wafer_count: 60000, excluded_recipes: []})],
      [serialNumbers[2], 'EUV Lithography', 97.0, 'qualified', '2024-11-01', JSON.stringify({throughput_wph: 160, overlay_nm: 1.1, cd_uniformity_nm: 0.8, uptime_pct: 93}), JSON.stringify({max_wafer_count: 100000, excluded_recipes: []})],
      [serialNumbers[3], 'Resist Coat', 90.0, 'qualified', '2024-09-20', JSON.stringify({throughput_wph: 250, coat_uniformity_pct: 0.8, defect_density: 0.02, uptime_pct: 97}), JSON.stringify({max_wafer_count: 80000, excluded_recipes: []})],
      [serialNumbers[9], 'CMP Polish', 86.0, 'qualified', '2024-09-05', JSON.stringify({throughput_wph: 35, removal_rate_uniformity_pct: 3.5, scratch_count: 0.5, uptime_pct: 91}), JSON.stringify({max_wafer_count: 30000, pad_life_wafers: 500})],
      [serialNumbers[8], 'Ion Implantation', 91.0, 'qualified', '2024-10-15', JSON.stringify({throughput_wph: 200, dose_uniformity_pct: 0.5, angle_accuracy_deg: 0.1, uptime_pct: 94}), JSON.stringify({max_wafer_count: 70000, excluded_recipes: []})],
      [serialNumbers[11], 'Thermal Oxidation', 93.0, 'qualified', '2024-07-15', JSON.stringify({throughput_wph: 12, thickness_uniformity_pct: 0.3, temp_uniformity_c: 0.5, uptime_pct: 98}), JSON.stringify({max_wafer_count: 500000, tube_life_runs: 200})],
      [serialNumbers[10], 'Wet Clean', 89.0, 'qualified', '2024-10-30', JSON.stringify({throughput_wph: 180, particle_removal_eff_pct: 99.5, metal_removal_eff_pct: 99.9, uptime_pct: 96}), JSON.stringify({max_wafer_count: 100000, bath_life_hours: 168})],
      [serialNumbers[5], 'Defect Inspection', 96.0, 'qualified', '2024-10-15', JSON.stringify({throughput_wph: 120, sensitivity_nm: 28, capture_rate_pct: 98, uptime_pct: 95}), JSON.stringify({max_wafer_count: 200000, excluded_recipes: []})],
      [serialNumbers[6], 'SEM Review', 98.0, 'qualified', '2024-08-25', JSON.stringify({throughput_wph: 15, resolution_nm: 0.5, measurement_repeatability_nm: 0.1, uptime_pct: 93}), JSON.stringify({max_wafer_count: 300000, excluded_recipes: []})],
      [serialNumbers[12], 'Dielectric Etch', 90.0, 'conditional', '2024-11-05', JSON.stringify({throughput_wph: 38, cd_uniformity_nm: 1.8, selectivity: 30, uptime_pct: 90}), JSON.stringify({max_wafer_count: 55000, restricted_to: ['SiO2', 'SiN'], notes: 'Pending full requalification after ESC replacement'})],
      [serialNumbers[13], 'CMP Polish', 82.0, 'pending', '2024-08-12', JSON.stringify({throughput_wph: 30, removal_rate_uniformity_pct: 4.2, scratch_count: 1.2, uptime_pct: 85}), JSON.stringify({max_wafer_count: 25000, notes: 'Awaiting pad conditioner replacement before requalification'})],
      [serialNumbers[7], 'Ion Implantation', 78.0, 'conditional', '2024-10-18', JSON.stringify({throughput_wph: 150, dose_uniformity_pct: 0.8, angle_accuracy_deg: 0.2, uptime_pct: 82}), JSON.stringify({restricted_to: ['low_energy'], notes: 'Source rebuild in progress, limited to E < 50keV'})],
      [serialNumbers[14], 'OCD Metrology', 97.0, 'qualified', '2024-12-05', JSON.stringify({throughput_wph: 80, repeatability_nm: 0.02, accuracy_nm: 0.05, uptime_pct: 97}), JSON.stringify({max_wafer_count: 500000, excluded_recipes: []})],
    ];

    for (const m of eqMatchData) {
      await client.query(
        `INSERT INTO equipment_matching
           (equipment_id, process_step, compatibility_score, qualification_status, last_qualified_date, performance_metrics, restrictions)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        m
      );
    }

    // ---------------------------------------------------------------
    // 9. Defect Patterns (15 items)
    // ---------------------------------------------------------------
    console.log('Seeding defect_patterns...');
    const defectPatData = [
      ['Center Hotspot', 'spatial', 23, 8.5, 'center', 'CVD Deposition', serialNumbers[4], JSON.stringify({center_x: 0, center_y: 0, radius_mm: 30, density_per_cm2: 0.45}), '2024-10-15', 'Elevated defect density in wafer center region likely caused by showerhead non-uniformity'],
      ['Edge Ring Defects', 'spatial', 45, 12.3, 'edge', 'Poly Etch', serialNumbers[1], JSON.stringify({inner_radius_mm: 140, outer_radius_mm: 148, defect_type: 'particle'}), '2024-10-18', 'Ring of particle defects at wafer edge from etch chamber edge ring degradation'],
      ['Radial Scratch Pattern', 'mechanical', 8, 3.2, 'full_wafer', 'CMP Polish', serialNumbers[9], JSON.stringify({angle_deg: 135, length_mm: 95, width_um: 15}), '2024-10-16', 'Linear scratch extending from center outward caused by CMP pad defect'],
      ['Cluster Contamination', 'random', 31, 5.7, 'quadrant_NE', 'PVD Deposition', serialNumbers[0], JSON.stringify({center_x: 45, center_y: -30, cluster_radius_mm: 12, particle_type: 'metallic'}), '2024-10-20', 'Localized cluster of metallic particle defects from PVD target micro-arcing'],
      ['Systematic Bridging', 'systematic', 67, 15.8, 'full_wafer', 'Lithography', serialNumbers[2], JSON.stringify({pitch_nm: 90, direction: 'horizontal', layer: 'Metal1', severity: 'critical'}), '2024-10-05', 'Repeating bridging defects at regular pitch from reticle contamination'],
      ['Random Particle Distribution', 'random', 15, 2.1, 'full_wafer', 'CVD Deposition', serialNumbers[4], JSON.stringify({density_per_cm2: 0.08, size_range_um: '0.1-0.5', composition: 'SiO2'}), '2024-10-22', 'Uniformly distributed random particles from chamber wall flaking'],
      ['Zone Defect Pattern', 'spatial', 28, 9.4, 'quadrant_SE', 'Dielectric Etch', serialNumbers[12], JSON.stringify({zone: 'top_right', area_percent: 15, defect_type: 'residue'}), '2024-10-23', 'Defects concentrated in specific wafer zone from non-uniform gas distribution'],
      ['Arc-shaped Defect Pattern', 'spatial', 12, 4.1, 'edge', 'CMP Polish', serialNumbers[9], JSON.stringify({arc_center_x: -20, arc_center_y: 10, arc_radius_mm: 80, arc_angle_deg: 45}), '2024-10-25', 'Defects along an arc trajectory from retaining ring wear pattern'],
      ['Concentric Ring Pattern', 'spatial', 5, 6.8, 'full_wafer', 'CVD Deposition', serialNumbers[4], JSON.stringify({ring_count: 4, spacing_mm: 20, origin: 'showerhead'}), '2024-10-21', 'Multiple concentric rings of film thickness non-uniformity from showerhead hole pattern'],
      ['Diagonal Scratch', 'mechanical', 3, 1.5, 'full_wafer', 'Wafer Handling', serialNumbers[9], JSON.stringify({start_x: -100, start_y: -100, end_x: 100, end_y: 100, width_um: 15}), '2024-10-20', 'Mechanical scratch across wafer diagonal from robot arm handling error'],
      ['Corner Void Pattern', 'systematic', 19, 7.2, 'quadrant_NE', 'PVD Deposition', serialNumbers[0], JSON.stringify({quadrant: 'NE', void_size_avg_um: 0.35, depth_nm: 120}), '2024-10-17', 'Voids concentrated in wafer edge quadrant from PVD deposition angle shadowing'],
      ['Spiral Defect Pattern', 'spatial', 37, 11.5, 'full_wafer', 'Resist Coat', serialNumbers[3], JSON.stringify({rotation_direction: 'CW', arm_count: 2, pitch_mm: 8}), '2024-10-18', 'Spiral-shaped defect distribution from resist dispense and spin dynamics'],
      ['Uniform Haze', 'random', 0, 100.0, 'full_wafer', 'Wet Clean', serialNumbers[10], JSON.stringify({haze_level_ppm: 0.15, uniformity_percent: 95, type: 'micro_roughness'}), '2024-09-15', 'Low-level uniform haze across entire wafer from micro-roughening during SC1 clean'],
      ['Localized Pitting', 'systematic', 22, 4.8, 'center', 'Dielectric Etch', serialNumbers[12], JSON.stringify({affected_die_count: 8, pit_depth_nm: 45, pit_density: 3.2}), '2024-10-26', 'Etch pits localized in specific die area from mask defect propagation'],
      ['Cross-shaped Pattern', 'mechanical', 10, 3.5, 'center', 'Wafer Handling', serialNumbers[3], JSON.stringify({arm_width_mm: 5, orientation_deg: 0, origin: 'notch_alignment'}), '2024-10-22', 'Defects forming cross pattern from wafer notch alignment chuck contact'],
    ];

    for (const dp of defectPatData) {
      await client.query(
        `INSERT INTO defect_patterns
           (pattern_name, pattern_type, defect_count, affected_area_percentage, wafer_zone, process_step, equipment_id, signature, first_detected, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        dp
      );
    }

    // ---------------------------------------------------------------
    // 10. Process Recipes (15 items)
    // ---------------------------------------------------------------
    console.log('Seeding process_recipes...');
    const recipesData = [
      ['Silicon Nitride PECVD', 'deposition', '7nm', '3.1', 'CVD', JSON.stringify([{step: 1, name: 'Chamber Purge', duration_sec: 30}, {step: 2, name: 'Gas Stabilize', duration_sec: 20}, {step: 3, name: 'Plasma Ignite', duration_sec: 5}, {step: 4, name: 'Deposition', duration_sec: 180}, {step: 5, name: 'Purge & Pump', duration_sec: 30}]), JSON.stringify({temperature_c: 400, pressure_torr: 4.0, SiH4_sccm: 40, NH3_sccm: 160, N2_sccm: 600, rf_power_w: 250, target_thickness_nm: 80}), 'Dr. Wei Zhang', 'active'],
      ['Poly Gate Etch', 'etch', '7nm', '5.2', 'Dry Etch', JSON.stringify([{step: 1, name: 'Breakthrough', duration_sec: 10}, {step: 2, name: 'Main Etch', duration_sec: 30}, {step: 3, name: 'Over Etch', duration_sec: 15}, {step: 4, name: 'Pump Down', duration_sec: 10}]), JSON.stringify({pressure_mtorr: 10, Cl2_sccm: 80, HBr_sccm: 120, O2_sccm: 5, rf_source_w: 400, rf_bias_w: 100, endpoint: 'OES_Si'}), 'Dr. Sarah Chen', 'active'],
      ['Deep UV Litho 193i', 'lithography', '28nm', '8.0', 'EUV Lithography', JSON.stringify([{step: 1, name: 'Alignment', duration_sec: 15}, {step: 2, name: 'Focus Map', duration_sec: 10}, {step: 3, name: 'Exposure', duration_sec: 5}, {step: 4, name: 'Post-Align Check', duration_sec: 5}]), JSON.stringify({wavelength_nm: 193, NA: 1.35, sigma_inner: 0.6, sigma_outer: 0.9, dose_mJ: 32, focus_um: 0, resist: 'ArF_immersion'}), 'Dr. Mike Tanaka', 'active'],
      ['Tungsten CMP', 'CMP', '7nm', '2.4', 'CMP', JSON.stringify([{step: 1, name: 'Platen 1 Bulk', duration_sec: 60}, {step: 2, name: 'Platen 2 Buff', duration_sec: 40}, {step: 3, name: 'Platen 3 Clean', duration_sec: 20}]), JSON.stringify({down_force_psi: 4.0, platen_rpm: 93, carrier_rpm: 87, slurry: 'W_selective', slurry_flow_ml: 200, target_removal_nm: 400}), 'Dr. Rachel Ng', 'active'],
      ['Boron Implant p-well', 'implant', '7nm', '1.3', 'High Current Implant', JSON.stringify([{step: 1, name: 'Beam Setup', duration_sec: 120}, {step: 2, name: 'Dose Calibration', duration_sec: 60}, {step: 3, name: 'Implant', duration_sec: 45}, {step: 4, name: 'Beam Off', duration_sec: 10}]), JSON.stringify({species: 'B11', energy_keV: 40, dose_cm2: '3e13', tilt_deg: 7, twist_deg: 22, beam_current_uA: 500}), 'Dr. James Lee', 'active'],
      ['Thermal Oxide Growth', 'oxidation', '130nm', '4.0', 'Diffusion Furnace', JSON.stringify([{step: 1, name: 'Load', duration_sec: 300}, {step: 2, name: 'Ramp Up', duration_sec: 600}, {step: 3, name: 'Oxidation', duration_sec: 1800}, {step: 4, name: 'Ramp Down', duration_sec: 600}, {step: 5, name: 'Unload', duration_sec: 300}]), JSON.stringify({type: 'dry', temperature_c: 1000, O2_slm: 5, N2_slm: 10, target_thickness_nm: 10}), 'Dr. Mary Sato', 'active'],
      ['Copper Seed PVD', 'deposition', '7nm', '2.1', 'PVD', JSON.stringify([{step: 1, name: 'Pre-clean', duration_sec: 30}, {step: 2, name: 'TaN Barrier', duration_sec: 20}, {step: 3, name: 'Ta Liner', duration_sec: 15}, {step: 4, name: 'Cu Seed', duration_sec: 25}, {step: 5, name: 'Cool Down', duration_sec: 20}]), JSON.stringify({target: 'Cu', dc_power_kw: 20, Ar_sccm: 40, pressure_mtorr: 2, chuck_temp_c: -40, target_thickness_nm: 50}), 'Dr. Wei Zhang', 'active'],
      ['BARC Coat', 'coat', '7nm', '1.5', 'Coat/Develop Track', JSON.stringify([{step: 1, name: 'Dispense', duration_sec: 3}, {step: 2, name: 'Spread', duration_sec: 5}, {step: 3, name: 'Spin', duration_sec: 30}, {step: 4, name: 'EBR', duration_sec: 5}, {step: 5, name: 'Bake', duration_sec: 60}]), JSON.stringify({material: 'ARC29A', spin_speed_rpm: 3000, bake_temp_c: 205, bake_time_sec: 60, target_thickness_nm: 37}), 'Dr. Lisa Wong', 'active'],
      ['Nitride Spacer Etch', 'etch', '7nm', '3.3', 'Dry Etch', JSON.stringify([{step: 1, name: 'Stabilize', duration_sec: 10}, {step: 2, name: 'Main Etch', duration_sec: 25}, {step: 3, name: 'Over Etch', duration_sec: 10}]), JSON.stringify({pressure_mtorr: 30, CHF3_sccm: 50, O2_sccm: 15, Ar_sccm: 200, rf_source_w: 600, rf_bias_w: 150, selectivity_to_oxide: 5}), 'Dr. Sarah Chen', 'active'],
      ['Metal1 Al Sputter', 'deposition', '180nm', '6.0', 'PVD', JSON.stringify([{step: 1, name: 'Degas', duration_sec: 60}, {step: 2, name: 'Pre-clean', duration_sec: 30}, {step: 3, name: 'Ti Liner', duration_sec: 10}, {step: 4, name: 'Al-Cu Sputter', duration_sec: 60}, {step: 5, name: 'TiN Cap', duration_sec: 15}]), JSON.stringify({target: 'Al_0.5Cu', dc_power_kw: 12, Ar_sccm: 40, pressure_mtorr: 3, chuck_temp_c: 350, target_thickness_nm: 500}), 'Dr. Wei Zhang', 'active'],
      ['STI Oxide Fill HDPCVD', 'deposition', '28nm', '4.1', 'CVD', JSON.stringify([{step: 1, name: 'Pre-heat', duration_sec: 30}, {step: 2, name: 'Deposition', duration_sec: 150}, {step: 3, name: 'Cool Down', duration_sec: 30}]), JSON.stringify({temperature_c: 680, SiH4_sccm: 55, O2_sccm: 100, Ar_sccm: 200, rf_source_w: 4000, rf_bias_w: 2500, target_thickness_nm: 600}), 'Dr. David Kim', 'active'],
      ['Phosphorus SD Implant', 'implant', '28nm', '2.0', 'Ion Implantation', JSON.stringify([{step: 1, name: 'Beam Setup', duration_sec: 180}, {step: 2, name: 'Dose Cal', duration_sec: 60}, {step: 3, name: 'Implant', duration_sec: 30}]), JSON.stringify({species: 'P31', energy_keV: 20, dose_cm2: '5e15', tilt_deg: 0, twist_deg: 0, beam_current_uA: 8000}), 'Dr. James Lee', 'active'],
      ['Post-Etch Resist Strip', 'ash', '7nm', '1.8', 'Dry Etch', JSON.stringify([{step: 1, name: 'Bulk Strip', duration_sec: 60}, {step: 2, name: 'Residue Clean', duration_sec: 60}]), JSON.stringify({O2_sccm: 500, N2_sccm: 50, pressure_mtorr: 800, rf_power_w: 1000, chuck_temp_c: 250}), 'Dr. Sarah Chen', 'active'],
      ['RCA Clean', 'wet_clean', '7nm', '2.2', 'Wet Clean', JSON.stringify([{step: 1, name: 'SC1', duration_sec: 600}, {step: 2, name: 'DI Rinse', duration_sec: 300}, {step: 3, name: 'HF Dip', duration_sec: 30}, {step: 4, name: 'DI Rinse', duration_sec: 300}, {step: 5, name: 'SC2', duration_sec: 600}, {step: 6, name: 'DI Rinse', duration_sec: 300}, {step: 7, name: 'IPA Dry', duration_sec: 180}]), JSON.stringify({SC1_temp_c: 75, SC1_NH4OH_H2O2_H2O: '1:1:5', SC2_temp_c: 75, SC2_HCl_H2O2_H2O: '1:1:6', HF_ratio: '1:100'}), 'Dr. Kevin Zhao', 'active'],
      ['Rapid Thermal Anneal', 'anneal', '7nm', '3.0', 'Diffusion Furnace', JSON.stringify([{step: 1, name: 'Load', duration_sec: 10}, {step: 2, name: 'Ramp', duration_sec: 15}, {step: 3, name: 'Soak', duration_sec: 5}, {step: 4, name: 'Cool', duration_sec: 30}]), JSON.stringify({peak_temp_c: 1050, ramp_rate_c_sec: 75, soak_time_sec: 5, ambient: 'N2', cool_rate_c_sec: 40}), 'Dr. Mary Sato', 'active'],
    ];

    for (const r of recipesData) {
      await client.query(
        `INSERT INTO process_recipes
           (recipe_name, process_type, technology_node, version, equipment_type, steps, parameters, approved_by, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        r
      );
    }

    // ---------------------------------------------------------------
    // 11. Quality Metrics (15 items)
    // ---------------------------------------------------------------
    console.log('Seeding quality_metrics...');
    const qualityData = [
      [lotNumbers[0], 'Die Yield', 92.3, '%', 95.0, 90.0, 99.0, 'Final Test', serialNumbers[2], 'center', 1.52, 1.67, '2024-10-15'],
      [lotNumbers[0], 'Defect Density', 0.18, 'defects/cm2', 0.1, 0.0, 0.5, 'Post-Litho Inspection', serialNumbers[5], '5-point', 1.28, 1.60, '2024-10-15'],
      [lotNumbers[5], 'Overlay Accuracy', 2.8, 'nm', 2.0, 0.0, 5.0, 'Lithography', serialNumbers[2], '9-point', 1.47, 1.67, '2024-10-21'],
      [lotNumbers[1], 'CD Uniformity', 1.5, 'nm', 1.0, 0.0, 3.0, 'Post-Etch', serialNumbers[1], '49-point', 1.33, 1.67, '2024-10-18'],
      [lotNumbers[8], 'Film Thickness Uniformity', 2.8, '%', 2.0, 0.0, 5.0, 'CVD Deposition', serialNumbers[4], '49-point', 1.17, 1.67, '2024-10-25'],
      [lotNumbers[3], 'Sheet Resistance', 462.0, 'ohm/sq', 450.0, 400.0, 500.0, 'Post-Implant Anneal', serialNumbers[8], '9-point', 1.27, 1.67, '2024-10-22'],
      [lotNumbers[3], 'Breakdown Voltage', 5.3, 'V', 5.5, 5.0, 7.0, 'Gate Oxide Test', serialNumbers[11], 'center', 1.10, 1.33, '2024-10-24'],
      [lotNumbers[10], 'Leakage Current', 3.2, 'pA', 1.0, 0.0, 10.0, 'Junction Test', serialNumbers[11], '5-point', 1.36, 1.67, '2024-10-17'],
      [lotNumbers[5], 'Particle Count', 18.0, 'count', 10.0, 0.0, 50.0, 'Post-Clean Inspection', serialNumbers[5], 'full_wafer', 1.28, 1.67, '2024-10-20'],
      [lotNumbers[7], 'Etch Rate Uniformity', 4.1, '%', 3.0, 0.0, 8.0, 'Poly Etch', serialNumbers[12], '49-point', 0.98, 1.33, '2024-10-23'],
      [lotNumbers[11], 'CMP Removal Rate', 210.5, 'nm/min', 200.0, 150.0, 250.0, 'CMP Polish', serialNumbers[9], '9-point', 1.32, 1.67, '2024-10-20'],
      [lotNumbers[2], 'Wafer Flatness TTV', 1.8, 'um', 2.0, 0.0, 5.0, 'Incoming Inspection', serialNumbers[14], '49-point', 1.60, 1.67, '2024-10-05'],
      [lotNumbers[10], 'Gate Oxide Integrity', 9.5, 'MV/cm', 10.0, 8.0, 15.0, 'Electrical Test', serialNumbers[11], 'center', 1.43, 2.33, '2024-10-18'],
      [lotNumbers[13], 'Contact Resistance', 17.2, 'ohm', 15.0, 5.0, 25.0, 'Electrical Test', serialNumbers[0], '5-point', 0.78, 1.67, '2024-10-26'],
      [lotNumbers[6], 'Step Height', 52.3, 'nm', 50.0, 30.0, 70.0, 'Post-CMP Metrology', serialNumbers[14], '9-point', 1.48, 1.67, '2024-09-28'],
    ];

    for (const q of qualityData) {
      await client.query(
        `INSERT INTO quality_metrics
           (wafer_lot_id, metric_name, metric_value, unit, target_value, lower_spec_limit, upper_spec_limit, process_step, equipment_id, measurement_site, cpk, cp, measured_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        q
      );
    }

    // ---------------------------------------------------------------
    // 12. Maintenance Schedules (15 items)
    // ---------------------------------------------------------------
    console.log('Seeding maintenance_schedules...');
    const maintData = [
      [serialNumbers[0], 'preventive', '2024-11-15', 4.0, 'high', 'PVD target replacement - Al-Cu target at 80% life, replace with new target and perform burn-in', 'John Park', JSON.stringify(['Al-Cu target', 'Shield kit', 'O-rings']), 'scheduled'],
      [serialNumbers[1], 'cleaning', '2024-11-01', 6.0, 'medium', 'Full wet clean of etch chamber including focus ring, upper electrode, and liner replacement', 'Sarah Chen', JSON.stringify(['Focus ring', 'Upper electrode', 'Chamber liner', 'Cleaning chemicals']), 'scheduled'],
      [serialNumbers[2], 'calibration', '2024-12-01', 8.0, 'critical', 'Annual lens aberration and focus calibration with ASML service engineer', 'Mike Tanaka', JSON.stringify(['Calibration reticle', 'Reference wafer']), 'scheduled'],
      [serialNumbers[3], 'preventive', '2024-10-25', 3.0, 'medium', 'Replace dispense nozzles, edge bead removal nozzle, and inline filters', 'Lisa Wong', JSON.stringify(['Dispense nozzles x4', 'EBR nozzle', 'Inline filters x6']), 'completed'],
      [serialNumbers[4], 'corrective', '2024-10-20', 12.0, 'critical', 'Replace failed zone 3 heater element causing temperature non-uniformity of 8C across wafer', 'David Kim', JSON.stringify(['Heater element zone 3', 'Thermocouple', 'Ceramic insulators']), 'completed'],
      [serialNumbers[5], 'calibration', '2024-11-10', 4.0, 'high', 'Quarterly sensitivity and pixel calibration using PSL sphere standards', 'Anna Petrov', JSON.stringify(['PSL standards 30nm', 'PSL standards 50nm', 'Calibration wafer']), 'scheduled'],
      [serialNumbers[6], 'preventive', '2024-11-20', 5.0, 'medium', 'E-beam column alignment, stigmation correction, and aperture cleaning', 'Tom Huang', JSON.stringify(['Aperture set', 'Gold on carbon standard', 'Filament']), 'scheduled'],
      [serialNumbers[7], 'corrective', '2024-10-18', 16.0, 'critical', 'Complete ion source rebuild after arc failure - replace source liner, extraction electrodes, and filament', 'James Lee', JSON.stringify(['Source liner', 'Extraction electrode set', 'Filament', 'Insulators', 'Gas feed tube']), 'in_progress'],
      [serialNumbers[8], 'parts_replacement', '2024-11-05', 3.0, 'high', 'Replace worn Faraday cup assembly showing dose measurement drift of 0.5%', 'James Lee', JSON.stringify(['Faraday cup assembly', 'Suppressor electrode', 'Wiring harness']), 'scheduled'],
      [serialNumbers[9], 'cleaning', '2024-10-28', 2.0, 'medium', 'Replace polishing pad and perform new pad conditioning break-in cycle', 'Rachel Ng', JSON.stringify(['IC1010 polishing pad', 'Conditioning diamond disk', 'Slurry tubing']), 'scheduled'],
      [serialNumbers[10], 'preventive', '2024-11-08', 10.0, 'high', 'Drain, clean, and refill all chemical tanks - SC1, SC2, HF, SPM baths', 'Kevin Zhao', JSON.stringify(['NH4OH 29%', 'H2O2 30%', 'HCl 37%', 'HF 49%', 'H2SO4 96%', 'Tank gaskets']), 'scheduled'],
      [serialNumbers[11], 'calibration', '2024-10-15', 6.0, 'high', 'Thermocouple calibration and temperature profile verification across all 4 tubes', 'Mary Sato', JSON.stringify(['Reference thermocouple', 'Profile wafers x8', 'TC wire']), 'completed'],
      [serialNumbers[12], 'parts_replacement', '2024-11-12', 8.0, 'critical', 'Replace electrostatic chuck showing He backside leak rate of 5 sccm exceeding 2 sccm spec', 'Sarah Chen', JSON.stringify(['Electrostatic chuck', 'He leak test fixture', 'Lift pins', 'RF cable']), 'scheduled'],
      [serialNumbers[13], 'preventive', '2024-11-25', 4.0, 'low', 'Preventive maintenance on slurry delivery system - replace tubing, filters, and flow meters', 'Rachel Ng', JSON.stringify(['Slurry tubing set', 'Point-of-use filters x4', 'Flow meter', 'Check valves x2']), 'scheduled'],
      [serialNumbers[14], 'calibration', '2024-12-05', 3.0, 'high', 'NIST-traceable calibration with reference standards for CD, SWA, and height measurements', 'Tom Huang', JSON.stringify(['NIST CD standard', 'SWA reference', 'Step height standard', 'Calibration wafer']), 'scheduled'],
    ];

    for (const m of maintData) {
      await client.query(
        `INSERT INTO maintenance_schedules
           (equipment_id, maintenance_type, scheduled_date, estimated_duration_hours, priority, description, assigned_technician, parts_required, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        m
      );
    }

    // ---------------------------------------------------------------
    // 13. SPC Alerts (15 items)
    // ---------------------------------------------------------------
    console.log('Seeding spc_alerts...');
    const spcData = [
      [serialNumbers[4], 'Chamber Temperature', 'Western Electric Rule 1 - Single point beyond 3-sigma', 412.5, 405.0, 395.0, 400.0, 'critical', 'CVD Deposition', 'Chamber temperature exceeded UCL by 7.5C during SiN deposition on LOT-2024-001', '2024-10-15 08:35:00'],
      [serialNumbers[1], 'RF Power', 'Nelson Rule 2 - 9 consecutive points on same side of center line', 308.0, 320.0, 280.0, 300.0, 'warning', 'Poly Etch', 'RF power trending 8W above center line for last 9 wafers', '2024-10-16 09:20:00'],
      [serialNumbers[2], 'Overlay X', 'Western Electric Rule 2 - 2 of 3 points beyond 2-sigma', 4.2, 5.0, 0.0, 2.0, 'warning', 'EUV Lithography', 'Overlay X approaching upper control limit - possible stage drift', '2024-10-21 08:10:00'],
      [serialNumbers[5], 'Defect Count', 'Western Electric Rule 1 - Single point beyond UCL', 52.0, 50.0, 0.0, 10.0, 'critical', 'Post-Litho Inspection', 'Defect count spiked to 52 particles vs UCL of 50 on LOT-2024-006', '2024-10-20 14:30:00'],
      [serialNumbers[1], 'Etch Rate', 'Nelson Rule 4 - 14 points alternating up and down', 2780.0, 3300.0, 2700.0, 3000.0, 'warning', 'Poly Etch', 'Etch rate showing sawtooth pattern indicating possible gas flow oscillation', '2024-10-23 07:50:00'],
      [serialNumbers[4], 'Film Thickness', 'Western Electric Rule 1 - Single point beyond 3-sigma', 92.0, 84.0, 76.0, 80.0, 'critical', 'CVD Deposition', 'Film thickness 12nm above target - possible gas flow controller malfunction', '2024-10-25 11:15:00'],
      [serialNumbers[9], 'CMP Removal Rate', 'Western Electric Rule 2 - 2 of 3 points beyond 2-sigma', 235.0, 250.0, 150.0, 200.0, 'warning', 'CMP Polish', 'Removal rate elevated - pad conditioning may be too aggressive', '2024-10-20 15:00:00'],
      [serialNumbers[2], 'CD Mean', 'Western Electric Rule 1 - Single point beyond 3-sigma', 48.5, 47.0, 43.0, 45.0, 'critical', 'EUV Lithography', 'CD mean 3.5nm above target - check dose and focus settings', '2024-10-17 13:40:00'],
      [serialNumbers[8], 'Implant Dose', 'Nelson Rule 6 - 4 of 5 points beyond 1-sigma', 3.15e13, 3.2e13, 2.8e13, 3.0e13, 'warning', 'Ion Implantation', 'Implant dose trending high - Faraday cup calibration may be drifting', '2024-10-22 15:10:00'],
      [serialNumbers[3], 'Spin Speed', 'Western Electric Rule 1 - Single point beyond 3-sigma', 3150.0, 3100.0, 2900.0, 3000.0, 'major', 'Resist Coat', 'Spin speed exceeded UCL by 50 rpm - motor controller spike detected', '2024-10-17 13:35:00'],
      [serialNumbers[11], 'Furnace Temperature', 'Western Electric Rule 2 - 2 of 3 points beyond 2-sigma', 1004.0, 1005.0, 995.0, 1000.0, 'minor', 'Thermal Oxidation', 'Furnace temperature approaching UCL - thermocouple aging suspected', '2024-09-16 09:00:00'],
      [serialNumbers[10], 'Particle Count Post-Clean', 'Western Electric Rule 1 - Single point beyond UCL', 28.0, 15.0, 0.0, 5.0, 'critical', 'Wet Clean', 'Particle count 28 post-clean vs UCL of 15 - bath contamination likely', '2024-09-22 11:30:00'],
      [serialNumbers[9], 'Slurry Flow Rate', 'Nelson Rule 2 - 9 consecutive points below center line', 185.0, 220.0, 180.0, 200.0, 'warning', 'CMP Polish', 'Slurry flow rate trending 15 ml/min below target - check pump and filter', '2024-10-25 10:05:00'],
      [serialNumbers[2], 'Focus Offset', 'Western Electric Rule 1 - Single point below LCL', -0.065, 0.05, -0.05, 0.0, 'major', 'EUV Lithography', 'Focus offset -65nm exceeds lower control limit of -50nm', '2024-10-20 09:35:00'],
      [serialNumbers[12], 'Gas Flow Ar', 'Nelson Rule 3 - 6 points monotonically decreasing', 195.0, 215.0, 185.0, 200.0, 'warning', 'Dielectric Etch', 'Ar gas flow steadily decreasing over last 6 lots - MFC calibration needed', '2024-10-23 08:00:00'],
    ];

    for (const s of spcData) {
      await client.query(
        `INSERT INTO spc_alerts
           (equipment_id, parameter_name, rule_violated, current_value, control_limit_upper, control_limit_lower, center_line, severity, process_step, description, triggered_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        s
      );
    }

    console.log('Seeding complete! All 13 tables populated successfully.');
  } catch (err) {
    console.error('Seeding failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
