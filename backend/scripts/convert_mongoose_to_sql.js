import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

// Convert import.meta.url to filename and dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODELS_DIR = path.join(__dirname, '../models');

// Helper to check if a value is a plain object
function isPlainObject(v) {
  return v && typeof v === 'object' && v.constructor === Object;
}

// Function to map mongoose types to SQL types
function getSqlType(pathName, pathObj) {
  const instance = pathObj.instance;
  const options = pathObj.options || {};
  
  // Specific overrides based on field name
  const nameLower = pathName.toLowerCase();
  if (nameLower === '_id') {
    return 'VARCHAR(24) PRIMARY KEY';
  }
  
  // If it's a reference to another document
  if (options.ref || (pathObj.caster && pathObj.caster.options && pathObj.caster.options.ref)) {
    return 'VARCHAR(24)';
  }

  // Handle Mongoose types
  switch (instance) {
    case 'String':
      // Check if it's likely a text field
      if (
        nameLower.includes('description') ||
        nameLower.includes('content') ||
        nameLower.includes('bio') ||
        nameLower.includes('note') ||
        nameLower.includes('url') ||
        nameLower.includes('image') ||
        nameLower.includes('avatar') ||
        nameLower.includes('gallery') ||
        nameLower.includes('highlight') ||
        nameLower.includes('detail') ||
        nameLower.includes('guide') ||
        nameLower.includes('instruction') ||
        nameLower.includes('metadata') ||
        nameLower.includes('key')
      ) {
        return 'TEXT';
      }
      return 'VARCHAR(255)';
      
    case 'Number':
      if (
        nameLower.includes('price') ||
        nameLower.includes('balance') ||
        nameLower.includes('amount') ||
        nameLower.includes('cost') ||
        nameLower.includes('fee') ||
        nameLower.includes('total') ||
        nameLower.includes('discount') ||
        nameLower.includes('commission') ||
        nameLower.includes('tax') ||
        nameLower.includes('vat')
      ) {
        return 'DECIMAL(12, 2)';
      }
      if (nameLower.includes('rating') || nameLower.includes('score')) {
        return 'DECIMAL(3, 2)';
      }
      if (nameLower.includes('coordinate') || nameLower.includes('lat') || nameLower.includes('lng') || nameLower.includes('latitute') || nameLower.includes('longitude')) {
        return 'DECIMAL(10, 8)';
      }
      return 'INT';
      
    case 'Boolean':
      return 'BOOLEAN';
      
    case 'Date':
      return 'TIMESTAMP';
      
    case 'Array':
    case 'DocumentArray':
    case 'Mixed':
    case 'Object':
    case 'Embedded':
      return 'JSON';
      
    default:
      return 'VARCHAR(255)';
  }
}

const UTILITY_TABLES = new Set([
  'auditlogs',
  'idempotencykeys',
  'refreshtokens',
  'comparesummaries',
  'adminsettings',
  'notificationtemplates',
  'deliveryslots',
  'gamificationlogs',
  'gamificationspingrants',
  'searchhistories',
  'viewedhistories'
]);

async function generateSchema(excludeSet, outputFileName) {
  const modelNames = Object.keys(mongoose.models);
  
  // First, map model name to table (collection) name
  const modelToTable = {};
  for (const name of modelNames) {
    const model = mongoose.models[name];
    const tableName = model.collection.name;
    if (!excludeSet.has(tableName)) {
      modelToTable[name] = tableName;
    }
  }

  let sqlOutput = `-- Auto-generated SQL schema for Bach Hoa Xanh / Lotte Mart from Mongoose Models
-- Generated on ${new Date().toISOString()}
-- Table mode: ${excludeSet.size > 0 ? 'Core Business Tables Only' : 'All Tables'}

`;

  const alterStatements = [];

  for (const name of modelNames) {
    const model = mongoose.models[name];
    const tableName = model.collection.name;
    
    // Skip excluded tables
    if (excludeSet.has(tableName)) continue;
    
    const paths = model.schema.paths;
    
    sqlOutput += `CREATE TABLE \`${tableName}\` (\n`;
    
    const columns = [];
    const addedParents = new Set();
    const foreignKeys = [];

    for (const pathName of Object.keys(paths)) {
      if (pathName === '__v') continue; // ignore mongoose version key
      
      // If it is a nested path like preferences.newsletter, we handle it at the parent level as JSON
      if (pathName.includes('.')) {
        const parentName = pathName.split('.')[0];
        if (addedParents.has(parentName)) continue;
        
        addedParents.add(parentName);
        columns.push(`  \`${parentName}\` JSON DEFAULT NULL`);
        continue;
      }
      
      const pathObj = paths[pathName];
      const sqlType = getSqlType(pathName, pathObj);
      let columnDef = `  \`${pathName}\` ${sqlType}`;
      
      // Handle defaults
      if (pathName !== '_id') {
        const options = pathObj.options || {};
        if (sqlType === 'JSON') {
          if (Array.isArray(options.default)) {
            columnDef += " DEFAULT '[]'";
          } else if (isPlainObject(options.default)) {
            columnDef += " DEFAULT '{}'";
          } else if (options.required) {
            // no default
          } else {
            columnDef += ' DEFAULT NULL';
          }
        } else if (options.default !== undefined && typeof options.default !== 'function' && !isPlainObject(options.default) && !Array.isArray(options.default)) {
          if (typeof options.default === 'string') {
            columnDef += ` DEFAULT '${options.default.replace(/'/g, "''")}'`;
          } else if (typeof options.default === 'boolean') {
            columnDef += ` DEFAULT ${options.default ? 'TRUE' : 'FALSE'}`;
          } else {
            columnDef += ` DEFAULT ${options.default}`;
          }
        } else if (options.default === Date.now) {
          columnDef += ' DEFAULT CURRENT_TIMESTAMP';
        } else if (!options.required) {
          columnDef += ' DEFAULT NULL';
        }

        // Handle required
        if (options.required) {
          columnDef += ' NOT NULL';
        }
      }
      
      columns.push(columnDef);

      // Check for foreign key references
      const options = pathObj.options || {};
      let refModel = options.ref;
      if (!refModel && pathObj.caster && pathObj.caster.options) {
        refModel = pathObj.caster.options.ref;
      }
      
      if (refModel && modelNames.includes(refModel) && modelToTable[refModel]) {
        foreignKeys.push({
          column: pathName,
          refModel: refModel
        });
      }
    }
    
    sqlOutput += columns.join(',\n');
    sqlOutput += `\n);\n\n`;

    // Generate ALTER TABLE statements for foreign keys to avoid circular dependency issues
    for (const fk of foreignKeys) {
      const refTable = modelToTable[fk.refModel];
      if (refTable) {
        alterStatements.push(`ALTER TABLE \`${tableName}\` ADD CONSTRAINT \`fk_${tableName}_${fk.column}\` FOREIGN KEY (\`${fk.column}\`) REFERENCES \`${refTable}\`(\`_id\`);`);
      }
    }
  }

  if (alterStatements.length > 0) {
    sqlOutput += `-- Foreign Key Constraints\n`;
    sqlOutput += alterStatements.join('\n') + '\n';
  }

  const outputPath = path.join(__dirname, `../../${outputFileName}`);
  fs.writeFileSync(outputPath, sqlOutput, 'utf-8');
  console.log(`Successfully exported SQL schema to: ${outputPath}`);
}

async function run() {
  console.log('Scanning models directory:', MODELS_DIR);
  const files = fs.readdirSync(MODELS_DIR).filter(f => f.endsWith('.js'));
  console.log(`Found ${files.length} model files.`);

  // Import each model file to register it with mongoose
  for (const file of files) {
    const filePath = path.join(MODELS_DIR, file);
    try {
      await import(`file://${filePath}`);
    } catch (err) {
      console.warn(`Warning: Failed to import model from ${file}:`, err.message);
    }
  }

  const modelNames = Object.keys(mongoose.models);
  console.log(`Successfully registered ${modelNames.length} models in Mongoose.`);

  // Generate full schema
  await generateSchema(new Set(), 'database_schema.sql');

  // Generate core-only schema
  await generateSchema(UTILITY_TABLES, 'database_schema_core.sql');
}

run().catch(err => {
  console.error('Fatal error running SQL conversion:', err);
});
