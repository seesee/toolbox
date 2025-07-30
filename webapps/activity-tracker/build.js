const fs = require('fs-extra');
const path = require('path');

class ActivityTrackerBuilder {
    constructor() {
        this.srcDir = path.join(__dirname, 'src');
        this.distDir = path.join(__dirname, 'dist');
    }

    async build() {
        console.log('🚀 Building Activity Tracker...');
        
        // Ensure dist directory exists
        await fs.ensureDir(this.distDir);
        
        try {
            // Read HTML template
            const htmlTemplate = await fs.readFile(
                path.join(this.srcDir, 'index.html'), 
                'utf8'
            );
            
            // Read and combine CSS
            const css = await this.readCSS();
            
            // Read and combine JavaScript
            const js = await this.readJavaScript();
            
            // Replace placeholders in HTML template
            let html = htmlTemplate
                .replace('{{CSS}}', css)
                .replace('{{JAVASCRIPT}}', js)
                .replace('{{VERSION}}', this.getVersion());
            
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
            
            console.log('✅ Build completed successfully!');
            console.log(`📁 Output: ${this.distDir}/index.html`);
            
        } catch (error) {
            console.error('❌ Build failed:', error.message);
            process.exit(1);
        }
    }
    
    async readCSS() {
        const cssPath = path.join(this.srcDir, 'styles', 'main.css');
        return await fs.readFile(cssPath, 'utf8');
    }
    
    async readJavaScript() {
        const scriptsDir = path.join(this.srcDir, 'scripts');
        
        // Read files in specific order
        const files = [
            'utils.js',
            'sounds.js',
            'pauseManager.js',
            'markdownRenderer.js',
            'ActivityTracker.js', 
            'reports.js', 
            'main.js'
        ];
        
        let combinedJS = '';
        
        for (const file of files) {
            const filePath = path.join(scriptsDir, file);
            if (await fs.pathExists(filePath)) {
                const content = await fs.readFile(filePath, 'utf8');
                combinedJS += `\n// === ${file} ===\n${content}\n`;
            }
        }
        
        return combinedJS;
    }
    
    getVersion() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const build = Math.floor(Date.now() / 1000) % 100000; // Last 5 digits of timestamp
        
        return `V${year}.${month}.${day}.${build}`;
    }
}

// Run the builder
if (require.main === module) {
    const builder = new ActivityTrackerBuilder();
    builder.build();
}

module.exports = ActivityTrackerBuilder;
