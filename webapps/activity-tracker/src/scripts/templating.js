/**
 * A robust templating engine using tokenizer and AST approach
 * This properly handles nested loops and maintains correct context
 */
class TemplatingEngine {
    constructor() {
        this.formatters = {
            // Date/Time Formatters
            date: (value, format = 'dd/mm/yyyy') => this.formatDate(value, format),
            time: (value) => {
                if (!value) return '--:--';
                let date = value instanceof Date ? value : new Date(value);
                if (isNaN(date.getTime())) return '--:--';
                return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            },
            datetime: (value) => new Date(value).toLocaleString('en-GB'),
            uppercase: (value) => String(value).toUpperCase(),
            lowercase: (value) => String(value).toLowerCase(),
            capitalize: (value) => String(value).charAt(0).toUpperCase() + String(value).slice(1),
            escapeHtml: (value) => this.escapeHtml(value),
            escapeCsv: (value) => this.escapeCsv(value),
            nl2br: (value) => String(value).replace(/\n/g, '<br>'),
            stripLinebreaks: (value) => String(value).replace(/(\r\n|\n|\r)/gm, " "),
            duration: (value) => this.formatDuration(value),
            markdown: (value) => {
                if (window.MarkdownRenderer) {
                    const renderer = new window.MarkdownRenderer();
                    return renderer.renderInlineWithClasses(String(value));
                }
                return this.escapeHtml(value);
            }
        };
        console.log('⚙️ Templating Engine Initialized (Tokenizer Version)');
    }

    /**
     * Main render method using tokenizer approach
     */
    render(template, data) {
        console.log('🔧 Starting template render with tokenizer');
        
        try {
            // Step 1: Tokenize the template
            const tokens = this.tokenize(template);
            console.log('🔍 Tokens:', tokens);
            
            // Step 2: Parse tokens into AST
            const ast = this.parse(tokens);
            console.log('🌳 AST:', ast);
            
            // Step 3: Evaluate AST with data
            const result = this.evaluate(ast, data);
            
            console.log('✅ Template render complete');
            return result;
        } catch (error) {
            console.error('❌ Template render error:', error);
            return `Template Error: ${error.message}`;
        }
    }

    /**
     * Tokenize template into discrete tokens
     */
    tokenize(template) {
        const tokens = [];
        let current = 0;
        
        while (current < template.length) {
            // Look for template expressions {{ ... }}
            const start = template.indexOf('{{', current);
            
            if (start === -1) {
                // No more template expressions, add rest as text
                if (current < template.length) {
                    tokens.push({
                        type: 'TEXT',
                        value: template.substring(current)
                    });
                }
                break;
            }
            
            // Add any text before the expression
            if (start > current) {
                tokens.push({
                    type: 'TEXT',
                    value: template.substring(current, start)
                });
            }
            
            // Find the end of the expression
            const end = template.indexOf('}}', start);
            if (end === -1) {
                throw new Error('Unclosed template expression at position ' + start);
            }
            
            // Extract and parse the expression
            const expression = template.substring(start + 2, end).trim();
            const token = this.parseExpression(expression);
            tokens.push(token);
            
            current = end + 2;
        }
        
        return tokens;
    }

    /**
     * Parse a single template expression into a token
     */
    parseExpression(expression) {
        console.log('🔍 Parsing expression:', JSON.stringify(expression));
        
        // Handle different types of expressions
        if (expression.startsWith('#each ')) {
            const match = expression.match(/^#each\s+(\w+)\s*=\s*([\w.]+)$/);
            console.log('🔍 Each match result:', match);
            if (!match) throw new Error('Invalid each expression: ' + expression);
            return {
                type: 'EACH_START',
                itemVar: match[1],
                arrayPath: match[2]
            };
        }
        
        if (expression === '/each') {
            console.log('🔍 Found /each');
            return { type: 'EACH_END' };
        }    


        if (expression.startsWith('#if ')) {
            const condition = expression.substring(4).trim();
            return {
                type: 'IF_START',
                condition: condition
            };
        }
        
        if (expression === 'else') {
            return { type: 'ELSE' };
        }
        
        if (expression === '/if') {
            return { type: 'IF_END' };
        }
        
        // Regular variable with optional formatters
        const parts = expression.split('|').map(s => s.trim());
        return {
            type: 'VARIABLE',
            path: parts[0],
            formatters: parts.slice(1)
        };
    }

    /**
     * Parse tokens into Abstract Syntax Tree
     */
    parse(tokens) {
        const ast = [];
        let current = 0;
        
        while (current < tokens.length) {
            const result = this.parseNode(tokens, current);
            if (result) {
                ast.push(result.node);
                current = result.nextIndex;
            } else {
                current++;
            }
        }
        
        return ast;
    }

    /**
     * Parse a single node and return it with the next index
     */
    parseNode(tokens, startIndex) {
        if (startIndex >= tokens.length) {
            console.log(`🔚 parseNode: reached end of tokens at index ${startIndex}`);
            return null;
        }
        
        const token = tokens[startIndex];
        console.log(`🔧 parseNode at ${startIndex}:`, token.type);
        
        switch (token.type) {
            case 'TEXT':
                return {
                    node: { type: 'text', value: token.value },
                    nextIndex: startIndex + 1
                };
                
            case 'VARIABLE':
                return {
                    node: { 
                        type: 'variable', 
                        path: token.path, 
                        formatters: token.formatters 
                    },
                    nextIndex: startIndex + 1
                };
                
            case 'EACH_START':
                return this.parseEachLoop(tokens, startIndex);
                
            case 'IF_START':
                return this.parseIfStatement(tokens, startIndex);
                
            case 'EACH_END':
            case 'IF_END':
            case 'ELSE':
                // These should be handled by their respective parent parsers
                console.warn('⚠️ Orphaned token:', token.type, 'at index', startIndex);
                return null;
                
            default:
                throw new Error('Unknown token type: ' + token.type);
        }
    }

    /**
     * Parse an each loop and its contents
     */
    parseEachLoop(tokens, startIndex) {
        const startToken = tokens[startIndex];
        const children = [];
        let current = startIndex + 1;
        let depth = 1;
        
        console.log(`🔄 Starting parseEachLoop for ${startToken.itemVar} = ${startToken.arrayPath}, startIndex: ${startIndex}`);
        
        while (current < tokens.length && depth > 0) {
            const token = tokens[current];
            console.log(`🔍 Processing token at ${current}:`, token.type, token);
            
            if (token.type === 'EACH_START') {
                console.log(`📈 Nested each found, depth was: ${depth}`);
                // Parse the nested each loop
                const result = this.parseEachLoop(tokens, current);
                children.push(result.node);
                current = result.nextIndex;
                console.log(`📍 After nested each, current index: ${current}`);
                // Don't increment depth here - the nested call handles its own depth
            } else if (token.type === 'EACH_END') {
                depth--;
                console.log(`📉 Each end found, depth now: ${depth}`);
                if (depth === 0) {
                    // Found our matching end
                    console.log(`✅ Found matching end for ${startToken.itemVar}`);
                    break;
                } else {
                    // This should not happen if parsing is correct
                    console.error(`❌ Unexpected EACH_END at depth ${depth} for ${startToken.itemVar}`);
                    current++;
                }
            } else {
                // Parse regular content
                const result = this.parseNode(tokens, current);
                if (result) {
                    children.push(result.node);
                    current = result.nextIndex;
                } else {
                    current++;
                }
            }
        }
        
        if (depth > 0) {
            console.error(`❌ Unclosed each loop for ${startToken.itemVar}, depth: ${depth}, current: ${current}, tokens.length: ${tokens.length}`);
            console.error('Remaining tokens:', tokens.slice(current).map(t => `${t.type}: ${JSON.stringify(t.value || t.path)}`));
            throw new Error(`Unclosed each loop for ${startToken.itemVar}`);
        }
        
        console.log(`✅ Completed parseEachLoop for ${startToken.itemVar}, nextIndex: ${current + 1}`);
        
        return {
            node: {
                type: 'each',
                itemVar: startToken.itemVar,
                arrayPath: startToken.arrayPath,
                children: children
            },
            nextIndex: current + 1
        };
    }

    /**
     * Parse an if statement and its contents
     */
    parseIfStatement(tokens, startIndex) {
        const startToken = tokens[startIndex];
        const ifChildren = [];
        const elseChildren = [];
        let current = startIndex + 1;
        let depth = 1;
        let inElse = false;
        
        while (current < tokens.length && depth > 0) {
            const token = tokens[current];
            
            if (token.type === 'IF_START') {
                depth++;
                const result = this.parseIfStatement(tokens, current);
                if (inElse) {
                    elseChildren.push(result.node);
                } else {
                    ifChildren.push(result.node);
                }
                current = result.nextIndex;
            } else if (token.type === 'IF_END') {
                depth--;
                if (depth === 0) break;
                current++;
            } else if (token.type === 'ELSE' && depth === 1) {
                inElse = true;
                current++;
            } else {
                const result = this.parseNode(tokens, current);
                if (result) {
                    if (inElse) {
                        elseChildren.push(result.node);
                    } else {
                        ifChildren.push(result.node);
                    }
                    current = result.nextIndex;
                } else {
                    current++;
                }
            }
        }
        
        return {
            node: {
                type: 'if',
                condition: startToken.condition,
                ifChildren: ifChildren,
                elseChildren: elseChildren
            },
            nextIndex: current + 1
        };
    }

    /**
     * Evaluate AST with given data context
     */
    evaluate(ast, data, depth = 0) {
        const indent = '  '.repeat(depth);
        console.log(`${indent}🔧 Evaluating AST with context:`, Object.keys(data));
        
        return ast.map(node => this.evaluateNode(node, data, depth)).join('');
    }

    /**
     * Evaluate a single AST node
     */
    evaluateNode(node, data, depth = 0) {
        const indent = '  '.repeat(depth);
        
        switch (node.type) {
            case 'text':
                return node.value;
                
            case 'variable':
                console.log(`${indent}🔤 Evaluating variable: ${node.path}`);
                let value = this.getValue(data, node.path);
                console.log(`${indent}📍 Value: ${value}`);
                
                // Apply formatters
                for (const formatter of node.formatters || []) {
                    value = this.applyFormatter(value, formatter);
                    console.log(`${indent}🎨 After ${formatter}: ${value}`);
                }
                
                return (value !== null && value !== undefined) ? String(value) : '';
                
            case 'each':
                console.log(`${indent}🔄 Evaluating each: ${node.itemVar} = ${node.arrayPath}`);
                const arrayData = this.getValue(data, node.arrayPath);
                console.log(`${indent}📊 Array data:`, arrayData);
                
                if (!Array.isArray(arrayData)) {
                    console.warn(`${indent}⚠️ Not an array:`, arrayData);
                    return '';
                }
                
                return arrayData.map((item, index) => {
                    const itemContext = {
                        ...data,
                        [node.itemVar]: item,
                        index: index,
                        first: index === 0,
                        last: index === arrayData.length - 1
                    };
                    
                    console.log(`${indent}📝 Processing item ${index}:`, item);
                    console.log(`${indent}🎯 Context keys:`, Object.keys(itemContext));
                    return this.evaluate(node.children, itemContext, depth + 1);
                }).join('');
                
            case 'if':
                console.log(`${indent}🔀 Evaluating if: ${node.condition}`);
                const conditionValue = this.getValue(data, node.condition);
                const isTrue = this.isTruthy(conditionValue);
                console.log(`${indent}📍 Condition result: ${isTrue}`);
                
                const childrenToEvaluate = isTrue ? node.ifChildren : node.elseChildren;
                return this.evaluate(childrenToEvaluate, data, depth + 1);
                
            default:
                throw new Error('Unknown node type: ' + node.type);
        }
    }

    /**
     * Get a value from data using dot notation
     */
    getValue(data, path) {
        if (!path || !data) return undefined;
        
        const parts = path.split('.');
        let current = data;
        
        for (const part of parts) {
            if (current === null || current === undefined) return undefined;
            current = current[part];
        }
        
        return current;
    }

    /**
     * Check if a value is truthy
     */
    isTruthy(value) {
        if (value === null || value === undefined) return false;
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'string') return value.length > 0;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object') return Object.keys(value).length > 0;
        return !!value;
    }

    /**
     * Apply a formatter to a value
     */
    applyFormatter(value, formatterExpression) {
        const match = formatterExpression.match(/^(\w+)(?:\s*\(\s*['"]?(.*?)['"]?\s*\))?$/);
        if (!match) return value;
        
        const [, formatterName, arg] = match;
        
        if (!this.formatters[formatterName]) {
            console.warn('⚠️ Unknown formatter:', formatterName);
            return value;
        }
        
        try {
            return arg !== undefined 
                ? this.formatters[formatterName](value, arg)
                : this.formatters[formatterName](value);
        } catch (error) {
            console.warn('❌ Formatter error:', formatterName, error);
            return value;
        }
    }

    // Keep all existing formatter methods...
    formatDate(dateValue, format) {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return 'Invalid Date';

        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        let formatted = format.replace(/mmm/g, monthNames[month]);
        formatted = formatted
            .replace(/yyyy/g, year)
            .replace(/mm/g, String(month + 1).padStart(2, '0'))
            .replace(/dd/g, String(day).padStart(2, '0'));
        
        return formatted;
    }

    formatDuration(minutes) {
        if (isNaN(minutes) || minutes < 0) return '';
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        let result = '';
        if (h > 0) result += `${h}h `;
        if (m > 0) result += `${m}m`;
        return result.trim();
    }

    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        return String(text).replace(/[&<>"']/g, (match) => {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match];
        });
    }

    escapeCsv(text) {
        if (text === null || text === undefined) return '';
        let str = String(text);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }
}

window.TemplatingEngine = TemplatingEngine;
console.log('⚙️ Templating Engine loaded (Tokenizer Version)');
