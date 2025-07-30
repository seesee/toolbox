/**
 * Lightweight Markdown Renderer for Activity Tracker
 * Handles basic markdown rendering for reports preview
 */

class MarkdownRenderer {
    constructor() {
        this.rules = [
            // Headers
            { pattern: /^### (.*$)/gim, replacement: '<h3>$1</h3>' },
            { pattern: /^## (.*$)/gim, replacement: '<h2>$1</h2>' },
            { pattern: /^# (.*$)/gim, replacement: '<h1>$1</h1>' },
            
            // Bold
            { pattern: /\*\*(.*)\*\*/gim, replacement: '<strong>$1</strong>' },
            
            // Italic
            { pattern: /\*(.*)\*/gim, replacement: '<em>$1</em>' },
            
            // Code (inline)
            { pattern: /`(.*)`/gim, replacement: '<code>$1</code>' },
            
            // Links
            { pattern: /\[([^\]]*)\]\(([^\)]*)\)/gim, replacement: '<a href="$2">$1</a>' },
            
            // Horizontal rules
            { pattern: /^---\s*$/gim, replacement: '<hr>' },
            
            // Blockquotes
            { pattern: /^> (.*)$/gim, replacement: '<blockquote>$1</blockquote>' },
            
            // Unordered lists
            { pattern: /^\- (.*)$/gim, replacement: '<li>$1</li>' }
        ];
    }

    /**
     * Render markdown to HTML
     * @param {string} markdown - Markdown text
     * @param {boolean} inline - Whether this is inline rendering (for descriptions)  
     * @returns {string} HTML string
     */
    render(markdown, inline = false) {
        if (!markdown || typeof markdown !== 'string') {
            return '';
        }

        let html = markdown.trim();

        // Apply markdown rules
        this.rules.forEach(rule => {
            html = html.replace(rule.pattern, rule.replacement);
        });

        // Handle line breaks and paragraphs
        if (inline) {
            // For inline content (descriptions), be more conservative
            // Double newlines become paragraph breaks
            html = html.replace(/\n\s*\n/gim, '</p><p>');
            // Single newlines become line breaks only if not in lists
            html = html.replace(/\n(?![<\/])/gim, '<br>');
        } else {
            // For full content, handle paragraphs more aggressively
            html = html.replace(/\n\s*\n/gim, '</p><p>');
            html = html.replace(/\n(?![<\/])/gim, '<br>');
        }

        // Wrap in paragraphs if not inline or if it doesn't start with a block element
        if (!inline || !html.match(/^<(h[1-6]|ul|ol|blockquote|hr)/)) {
            html = '<p>' + html + '</p>';
        }

        // Clean up empty paragraphs
        html = html.replace(/<p>\s*<\/p>/gim, '');
        html = html.replace(/<p><h/gim, '<h');
        html = html.replace(/<\/h([1-6])><\/p>/gim, '</h$1>');
        html = html.replace(/<p><hr><\/p>/gim, '<hr>');
        html = html.replace(/<p><blockquote>/gim, '<blockquote>');
        html = html.replace(/<\/blockquote><\/p>/gim, '</blockquote>');
        html = html.replace(/<p><ul>/gim, '<ul>');
        html = html.replace(/<\/ul><\/p>/gim, '</ul>');

        // Handle lists
        html = this.renderLists(html);
        
        // Clean up extra line breaks around lists
        html = html.replace(/<br>\s*<\/li>/gim, '</li>');
        html = html.replace(/<li><br>/gim, '<li>');
        html = html.replace(/<\/ul><br>/gim, '</ul>');
        html = html.replace(/<br><ul>/gim, '<ul>');

        return html;
    }

    /**
     * Process list items into proper ul/ol tags
     * @param {string} html - HTML with list items
     * @returns {string} HTML with proper list structure
     */
    renderLists(html) {
        // Find sequences of <li> tags (including those separated by <br> tags) and wrap them in <ul>
        html = html.replace(/(<li>.*?<\/li>)(\s*(<br>)?\s*<li>.*?<\/li>)*/gim, (match) => {
            // Remove <br> tags between list items
            const cleanMatch = match.replace(/<br>\s*(?=<li>)/gim, '');            return '<ul>' + match + '</ul>';
        });

        // Clean up paragraph tags around lists
        html = html.replace(/<p><ul>/gim, '<ul>');
        html = html.replace(/<\/ul><\/p>/gim, '</ul>');
        html = html.replace(/<p><li>/gim, '<li>');
        html = html.replace(/<\/li><\/p>/gim, '</li>');
        
        // Remove <br> tags immediately before/after lists
        html = html.replace(/<br>\s*<ul>/gim, '<ul>');
        html = html.replace(/<\/ul>\s*<br>/gim, '</ul>');

        return html;
    }

    /**
     * Render inline markdown (for descriptions)
     * @param {string} markdown - Markdown text
     * @returns {string} HTML string
     */
    renderInline(markdown) {
        return this.render(markdown, true);
    }

    /**
     * Render markdown with custom CSS classes
     * @param {string} markdown - Markdown text
     * @param {boolean} inline - Whether this is inline rendering
     * @returns {string} HTML with CSS classes
     */
    renderWithClasses(markdown, inline = false) {
        let html = this.render(markdown, inline);
        
        // Add CSS classes for styling
        html = html.replace(/<h1>/gim, '<h1 class="md-h1">');
        html = html.replace(/<h2>/gim, '<h2 class="md-h2">');
        html = html.replace(/<h3>/gim, '<h3 class="md-h3">');
        html = html.replace(/<blockquote>/gim, '<blockquote class="md-blockquote">');
        html = html.replace(/<code>/gim, '<code class="md-code">');
        html = html.replace(/<ul>/gim, '<ul class="md-list">');
        html = html.replace(/<p>/gim, '<p class="md-paragraph">');
        html = html.replace(/<hr>/gim, '<hr class="md-hr">');

        return html;
    }

    /**
     * Render inline markdown with CSS classes (for descriptions)
     * @param {string} markdown - Markdown text
     * @returns {string} HTML string with classes
     */
    renderInlineWithClasses(markdown) {
        return this.renderWithClasses(markdown, true);
    }

    /**
     * Create a preview of markdown content (first few lines)
     * @param {string} markdown - Markdown text
     * @param {number} maxLines - Maximum lines to preview
     * @returns {string} HTML preview
     */
    preview(markdown, maxLines = 10) {
        if (!markdown) return '';
        
        const lines = markdown.split('\n').slice(0, maxLines);
        const previewMarkdown = lines.join('\n');
        
        if (lines.length >= maxLines && markdown.split('\n').length > maxLines) {
            return this.renderWithClasses(previewMarkdown) + '<p class="md-preview-more">...</p>';
        }
        
        return this.renderWithClasses(previewMarkdown);
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.MarkdownRenderer = MarkdownRenderer;
}

console.log('📝 Markdown Renderer module loaded');
