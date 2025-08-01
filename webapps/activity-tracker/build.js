const fs = require('fs-extra');
const path = require('path');
const { minify: minifyJS } = require('terser');
const CleanCSS = require('clean-css');
const { minify: minifyHTML } = require('html-minifier-terser');

class ActivityTrackerBuilder {
    constructor(options = {}) {
        this.srcDir = path.join(__dirname, 'src');
        this.distDir = path.join(__dirname, 'dist');
        this.minify = options.minify !== false; // Default to true
        this.verbose = options.verbose || false;
    }

    async build() {
        console.log('🚀 Building Activity Tracker...');
        const startTime = Date.now();
        
        // Ensure dist directory exists
        await fs.ensureDir(this.distDir);
        
        try {
            // Get version for this build first
            const version = this.getVersion();
            
            // Read HTML template
            const htmlTemplate = await fs.readFile(
                path.join(this.srcDir, 'index.html'), 
                'utf8'
            );
            
            // Read and combine CSS
            const css = this.minify ? await this.readAndMinifyCSS() : await this.readCSS();
            
            // Read and combine JavaScript
            const js = this.minify ? await this.readAndMinifyJavaScript(version) : await this.readJavaScript(version);
            
            if (this.verbose) {
                console.log(`📊 CSS size: ${Math.round(css.length / 1024)}KB`);
                console.log(`📊 JS size: ${Math.round(js.length / 1024)}KB`);
                console.log(`📊 Minification: ${this.minify ? 'enabled' : 'disabled'}`);
            }
            
            // Replace placeholders in HTML template
            let html = htmlTemplate
                .replace('{{CSS}}', css)
                .replace('{{JAVASCRIPT}}', js)
                .replace('{{VERSION}}', version);
            
            // Minify HTML if requested
            if (this.minify) {
                html = await this.minifyHTMLContent(html);
            }
            
            // Write final HTML file
            await fs.writeFile(
                path.join(this.distDir, 'index.html'), 
                html
            );
            
            // Copy service worker
            await fs.copy(
                path.join(this.srcDir, 'sw.js'),
                path.join(this.distDir, 'sw.js')
            );

            const faviconPath = path.join(this.srcDir, 'favicon.ico');
            if (await fs.pathExists(faviconPath)) {
                await fs.copy(
                    faviconPath,
                    path.join(this.distDir, 'favicon.ico')
                );
                console.log('📄 Favicon copied');
            } 
            
            const endTime = Date.now();
            const buildTime = endTime - startTime;
            const fileSize = Math.round(html.length / 1024);
            
            console.log('✅ Build completed successfully!');
            console.log(`📁 Output: ${this.distDir}/index.html`);
            console.log(`⚡ Build time: ${buildTime}ms`);
            console.log(`📦 File size: ${fileSize}KB`);
            
        } catch (error) {
            console.error('❌ Build failed:', error.message);
            process.exit(1);
        }
    }
    
    async readCSS() {
        const cssPath = path.join(this.srcDir, 'styles', 'main.css');
        return await fs.readFile(cssPath, 'utf8');
    }
    
    async readAndMinifyCSS() {
        const cssPath = path.join(this.srcDir, 'styles', 'main.css');
        const css = await fs.readFile(cssPath, 'utf8');
        
        const cleanCSS = new CleanCSS({
            level: 2, // Advanced optimizations
            returnPromise: false
        });
        
        const result = cleanCSS.minify(css);
        
        if (result.errors && result.errors.length > 0) {
            console.warn('CSS minification warnings:', result.errors);
        }
        
        return result.styles;
    }
    
    async readJavaScript(version) {
        const scriptsDir = path.join(this.srcDir, 'scripts');
        
        // Read files in specific order
        const files = [
            'utils.js',
            'sounds.js',
            'pauseManager.js',
            'pomodoroManager.js',
            'markdownRenderer.js',
            'templating.js',
            'report-templates.js',
            'ActivityTracker.js', 
            'reports.js', 
            'main.js'
        ];
        
        let combinedJS = `// Application version\nconst APP_VERSION = '${version}';\n\n`;
        
        for (const file of files) {
            const filePath = path.join(scriptsDir, file);
            if (await fs.pathExists(filePath)) {
                const content = await fs.readFile(filePath, 'utf8');
                combinedJS += `\n// === ${file} ===\n${content}\n`;
            }
        }
        
        return combinedJS;
    }
    
    async readAndMinifyJavaScript(version) {
        const scriptsDir = path.join(this.srcDir, 'scripts');
        
        // Read files in specific order
        const files = [
            'utils.js',
            'sounds.js',
            'pauseManager.js',
            'pomodoroManager.js',
            'markdownRenderer.js',
            'templating.js',
            'report-templates.js',
            'ActivityTracker.js', 
            'reports.js', 
            'main.js'
        ];
        
        let combinedJS = `const APP_VERSION = '${version}';\n`;
        
        for (const file of files) {
            const filePath = path.join(scriptsDir, file);
            if (await fs.pathExists(filePath)) {
                const content = await fs.readFile(filePath, 'utf8');
                // Don't add file separators in production
                combinedJS += content + '\n';
            }
        }
        
        try {
            const result = await minifyJS(combinedJS, {
                compress: {
                    // Only drop console logs if minification is fully enabled
                    drop_console: this.minify ? ['log'] : false,
                    drop_debugger: true,
                    passes: 2
                },
                mangle: {
                    // Don't mangle function names that might be called from HTML
                    reserved: [
                        'showSection', 'addCurrentTime', 'generateReport', 'setWeeklyReport',
                        'previousWeek', 'nextWeek', 'downloadReport', 'saveSettings',
                        'enableNotifications', 'testNotification', 'testNotificationSound',
                        'refreshNotificationStatus', 'clearAllData', 'closeEditModal',
                        'togglePause', 'saveReportTemplates', 'resetReportTemplates',
                        'exportDatabase', 'importDatabase', 'handleImportFile', 'runServiceWorkerTest',
                        'openTemplateManager', 'closeTemplateManager', 'addNewTemplate', 'resetToDefaults',
                        'saveCurrentTemplate', 'deleteCurrentTemplate', 'duplicateCurrentTemplate',
                        'refreshTemplatePreview', 'saveAllTemplates', 'switchPreviewTab', 'switchReportPreviewTab', 'switchTemplateTab'
                    ]
                },
                format: {
                    comments: false // Remove all comments
                }
            });
            
            if (result.error) {
                throw result.error;
            }
            
            return result.code;
        } catch (error) {
            console.error('❌ JavaScript minification failed:', error.message);
            console.log('Falling back to unminified JavaScript');
            return combinedJS;
        }
    }
    
    async minifyHTMLContent(html) {
        try {
            return await minifyHTML(html, {
                collapseWhitespace: true,
                removeComments: true,
                removeRedundantAttributes: true,
                removeScriptTypeAttributes: true,
                removeStyleLinkTypeAttributes: true,
                minifyCSS: true,
                minifyJS: false, // We handle JS separately
                useShortDoctype: true
            });
        } catch (error) {
            console.warn('HTML minification failed, using original:', error.message);
            return html;
        }
    }
    
    getVersion() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateKey = `${year}.${month}.${day}`;
        
        // Load version history from file
        const versionFile = path.join(__dirname, '.version-history.json');
        let versionHistory = {};
        
        try {
            if (fs.existsSync(versionFile)) {
                versionHistory = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
            }
        } catch (error) {
            console.warn('Could not read version history, starting fresh');
            versionHistory = {};
        }
        
        // Get current build number for today, or start at 1
        const currentBuild = (versionHistory[dateKey] || 0) + 1;
        const buildNumber = String(currentBuild).padStart(2, '0');
        
        // Update version history
        versionHistory[dateKey] = currentBuild;
        
        // Clean up old entries (keep last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        Object.keys(versionHistory).forEach(key => {
            const [y, m, d] = key.split('.').map(Number);
            const entryDate = new Date(y, m - 1, d);
            if (entryDate < thirtyDaysAgo) {
                delete versionHistory[key];
            }
        });
        
        // Save updated version history
        try {
            fs.writeFileSync(versionFile, JSON.stringify(versionHistory, null, 2));
        } catch (error) {
            console.warn('Could not save version history:', error.message);
        }
        
        const version = `${year}.${month}.${day}.${buildNumber}`;
        console.log(`📋 Version: ${version} (build ${currentBuild} for ${dateKey})`);
        
        return version;
    }
}

// Run the builder
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {
        minify: !args.includes('--no-minify'),
        verbose: args.includes('--verbose')
    };
    
    const builder = new ActivityTrackerBuilder(options);
    builder.build();
}

module.exports = ActivityTrackerBuilder;
