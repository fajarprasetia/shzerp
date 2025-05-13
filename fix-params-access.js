const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all API route files with [id] in the path
const apiRoutesCommand = "find app/api -name '*.ts' -path '*/\\[id\\]/*' -type f";
const apiRoutes = execSync(apiRoutesCommand).toString().trim().split('\n');

console.log(`Found ${apiRoutes.length} API routes to check...`);

let modifiedCount = 0;

// Process each file
apiRoutes.forEach(filePath => {
  // Read file content
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip files that already use unwrappedParams
  if (content.includes('unwrappedParams')) {
    console.log(`Skipping already fixed file: ${filePath}`);
    return;
  }
  
  // Check for direct params.id access
  if (content.includes('params.id')) {
    // Update the params type in function signature
    content = content.replace(
      /params\s*}:\s*{\s*params:\s*{\s*id:\s*string\s*}\s*}/g,
      'params }: { params: Promise<{ id: string }> }'
    );
    
    // Add unwrapping logic before the first params.id access
    const paramsIdIndex = content.indexOf('params.id');
    const lineBeforeParamsId = content.lastIndexOf('\n', paramsIdIndex);
    
    // Split content into before and after the insertion point
    const beforeInsertion = content.substring(0, lineBeforeParamsId + 1);
    const afterInsertion = content.substring(lineBeforeParamsId + 1);
    
    // Add the unwrapping code
    content = `${beforeInsertion}    // Unwrap params before accessing properties
    const unwrappedParams = await params;
    const id = unwrappedParams.id;
    ${afterInsertion}`;
    
    // Replace all instances of params.id with id
    content = content.replace(/params\.id/g, 'id');
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated file: ${filePath}`);
    modifiedCount++;
  }
});

console.log(`Modified ${modifiedCount} files to fix params.id access for Next.js 15.2`); 