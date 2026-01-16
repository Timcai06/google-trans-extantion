/**
 * Copy Build Assets to Extension Root
 * 
 * This script copies the built assets from TAROT-main/dist to the extension root directory.
 * It includes backup and error handling mechanisms to ensure safe deployment.
 * 
 * Requirements: 7.1, 7.2
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const DIST_DIR = path.join(__dirname, '../dist');
const EXTENSION_ROOT = path.join(__dirname, '../..');
const ASSETS_SOURCE = path.join(DIST_DIR, 'assets');
const ASSETS_DEST = path.join(EXTENSION_ROOT, 'assets');
const GAME_HTML_SOURCE = path.join(DIST_DIR, 'index.html');
const GAME_HTML_DEST = path.join(EXTENSION_ROOT, 'game.html');

// Backup suffix
const BACKUP_SUFFIX = '.backup';

/**
 * Create a backup of a file or directory
 * @param {string} targetPath - Path to backup
 * @returns {string|null} - Backup path or null if no backup was created
 */
function createBackup(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return null;
  }

  const backupPath = targetPath + BACKUP_SUFFIX;
  
  try {
    // Remove old backup if exists
    if (fs.existsSync(backupPath)) {
      if (fs.statSync(backupPath).isDirectory()) {
        fs.rmSync(backupPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(backupPath);
      }
    }

    // Create new backup
    if (fs.statSync(targetPath).isDirectory()) {
      fs.cpSync(targetPath, backupPath, { recursive: true });
      console.log(`✓ Created backup: ${path.basename(backupPath)}`);
    } else {
      fs.copyFileSync(targetPath, backupPath);
      console.log(`✓ Created backup: ${path.basename(backupPath)}`);
    }

    return backupPath;
  } catch (error) {
    console.error(`✗ Failed to create backup for ${targetPath}:`, error.message);
    return null;
  }
}

/**
 * Restore from backup
 * @param {string} targetPath - Original path
 * @param {string} backupPath - Backup path
 */
function restoreBackup(targetPath, backupPath) {
  if (!backupPath || !fs.existsSync(backupPath)) {
    return;
  }

  try {
    // Remove failed target
    if (fs.existsSync(targetPath)) {
      if (fs.statSync(targetPath).isDirectory()) {
        fs.rmSync(targetPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(targetPath);
      }
    }

    // Restore backup
    if (fs.statSync(backupPath).isDirectory()) {
      fs.cpSync(backupPath, targetPath, { recursive: true });
    } else {
      fs.copyFileSync(backupPath, targetPath);
    }

    console.log(`✓ Restored backup: ${path.basename(targetPath)}`);
  } catch (error) {
    console.error(`✗ Failed to restore backup:`, error.message);
  }
}

/**
 * Clean up backup files
 * @param {string[]} backupPaths - Array of backup paths to remove
 */
function cleanupBackups(backupPaths) {
  for (const backupPath of backupPaths) {
    if (!backupPath || !fs.existsSync(backupPath)) {
      continue;
    }

    try {
      if (fs.statSync(backupPath).isDirectory()) {
        fs.rmSync(backupPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(backupPath);
      }
      console.log(`✓ Cleaned up backup: ${path.basename(backupPath)}`);
    } catch (error) {
      console.warn(`⚠ Failed to cleanup backup ${backupPath}:`, error.message);
    }
  }
}

/**
 * Copy directory recursively
 * @param {string} source - Source directory
 * @param {string} destination - Destination directory
 */
function copyDirectory(source, destination) {
  if (!fs.existsSync(source)) {
    throw new Error(`Source directory does not exist: ${source}`);
  }

  // Create destination directory if it doesn't exist
  if (fs.existsSync(destination)) {
    fs.rmSync(destination, { recursive: true, force: true });
  }
  fs.mkdirSync(destination, { recursive: true });

  // Copy all files and subdirectories
  fs.cpSync(source, destination, { recursive: true });
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Starting asset copy process...\n');

  const backups = [];

  try {
    // Step 1: Verify source files exist
    console.log('📋 Step 1: Verifying source files...');
    if (!fs.existsSync(DIST_DIR)) {
      throw new Error(`Build output directory not found: ${DIST_DIR}\nPlease run 'npm run build' first.`);
    }

    if (!fs.existsSync(ASSETS_SOURCE)) {
      throw new Error(`Assets directory not found: ${ASSETS_SOURCE}\nBuild may have failed.`);
    }

    console.log('✓ Source files verified\n');

    // Step 2: Create backups
    console.log('📋 Step 2: Creating backups...');
    const assetsBackup = createBackup(ASSETS_DEST);
    if (assetsBackup) backups.push(assetsBackup);

    const gameHtmlBackup = createBackup(GAME_HTML_DEST);
    if (gameHtmlBackup) backups.push(gameHtmlBackup);

    console.log('');

    // Step 3: Copy assets directory
    console.log('📋 Step 3: Copying assets directory...');
    copyDirectory(ASSETS_SOURCE, ASSETS_DEST);
    console.log(`✓ Copied assets to: ${path.relative(EXTENSION_ROOT, ASSETS_DEST)}\n`);

    // Step 4: Copy game.html (if needed)
    if (fs.existsSync(GAME_HTML_SOURCE)) {
      console.log('📋 Step 4: Copying game.html...');
      fs.copyFileSync(GAME_HTML_SOURCE, GAME_HTML_DEST);
      console.log(`✓ Copied game.html to: ${path.relative(EXTENSION_ROOT, GAME_HTML_DEST)}\n`);
    } else {
      console.log('⚠ Step 4: game.html not found in dist, skipping...\n');
    }

    // Step 5: Verify copied files
    console.log('📋 Step 5: Verifying copied files...');
    if (!fs.existsSync(ASSETS_DEST)) {
      throw new Error('Assets directory was not copied successfully');
    }

    const copiedFiles = fs.readdirSync(ASSETS_DEST);
    console.log(`✓ Verified ${copiedFiles.length} files in assets directory`);
    console.log(`  Files: ${copiedFiles.join(', ')}\n`);

    // Step 6: Clean up backups
    console.log('📋 Step 6: Cleaning up backups...');
    cleanupBackups(backups);
    console.log('');

    // Success
    console.log('✅ Asset copy completed successfully!\n');
    console.log('Next steps:');
    console.log('  1. Update game.html to reference local assets');
    console.log('  2. Update manifest.json with CSP policy');
    console.log('  3. Test the extension in Chrome\n');

  } catch (error) {
    console.error('\n❌ Error during asset copy:', error.message);
    console.error('\n🔄 Attempting to restore backups...\n');

    // Restore backups
    if (backups.length > 0) {
      if (backups[0]) restoreBackup(ASSETS_DEST, backups[0]);
      if (backups[1]) restoreBackup(GAME_HTML_DEST, backups[1]);
    }

    console.error('\n💡 Troubleshooting tips:');
    console.error('  1. Ensure you have run "npm run build" first');
    console.error('  2. Check that you have write permissions to the extension directory');
    console.error('  3. Verify that the dist directory contains the expected files');
    console.error('  4. Check the error message above for specific details\n');

    process.exit(1);
  }
}

// Run the script
main();
