import { Pool } from 'pg';

async function importAircraftData() {
  // External database connection
  const externalPool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_TPebsRl7KgJ2@ep-bold-silence-a416nvhi.us-east-1.aws.neon.tech/neondb?sslmode=require'
  });

  // Current database connection
  const localPool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Connecting to external database...');
    
    // Get table structure
    const structureQuery = `
      SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'aircraft' 
      ORDER BY ordinal_position;
    `;
    
    const structureResult = await externalPool.query(structureQuery);
    console.log('Aircraft table structure:');
    console.log(structureResult.rows);

    // Get sample data to understand the structure
    const dataQuery = 'SELECT * FROM aircraft LIMIT 5;';
    const dataResult = await externalPool.query(dataQuery);
    console.log('\nSample aircraft data:');
    console.log(dataResult.rows);

    // Get total count
    const countResult = await externalPool.query('SELECT COUNT(*) FROM aircraft;');
    console.log(`\nTotal records: ${countResult.rows[0].count}`);

    // Check what status values exist
    const statusQuery = 'SELECT DISTINCT status FROM aircraft;';
    const statusResult = await externalPool.query(statusQuery);
    console.log('\nUnique status values:');
    console.log(statusResult.rows.map(row => row.status));

    // Now import all the data
    console.log('\nImporting aircraft data...');
    const allDataQuery = 'SELECT * FROM aircraft ORDER BY id;';
    const allDataResult = await externalPool.query(allDataQuery);
    
    console.log(`Copying ${allDataResult.rows.length} aircraft records...`);
    
    // Insert data into our local database
    for (const aircraft of allDataResult.rows) {
      const insertQuery = `
        INSERT INTO aircraft (
          tail_number, model, manufacturer, serial_number, year_manufactured,
          last_maintenance_date, next_maintenance_date, flight_hours, home_base,
          status_details, image_url, status, next_major_inspection, status_summary,
          limitation_details, grounding_reason, maintenance_owner, maintenance_notes,
          regulatory_reference, status_tags, primary_status, secondary_statuses
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      `;
      
      const values = [
        aircraft.tail_number, aircraft.model, aircraft.manufacturer, aircraft.serial_number,
        aircraft.year_manufactured, aircraft.last_maintenance_date, aircraft.next_maintenance_date,
        aircraft.flight_hours, aircraft.home_base, aircraft.status_details, aircraft.image_url,
        aircraft.status, aircraft.next_major_inspection, aircraft.status_summary,
        aircraft.limitation_details, aircraft.grounding_reason, aircraft.maintenance_owner,
        aircraft.maintenance_notes, aircraft.regulatory_reference, aircraft.status_tags,
        aircraft.primary_status, aircraft.secondary_statuses
      ];
      
      await localPool.query(insertQuery, values);
    }
    
    console.log('✓ Aircraft data imported successfully!');
    
    // Verify the import
    const verifyResult = await localPool.query('SELECT COUNT(*) FROM aircraft;');
    console.log(`✓ Verified: ${verifyResult.rows[0].count} records in local database`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await externalPool.end();
    await localPool.end();
  }
}

importAircraftData();