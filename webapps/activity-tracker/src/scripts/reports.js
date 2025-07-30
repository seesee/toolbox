/**
 * Reports functionality for Activity Tracker
 * Extends the ActivityTracker class with reporting capabilities
 */

/**
 * Initialize markdown renderer
 */
ActivityTracker.prototype.initMarkdownRenderer = function() {
    if (typeof MarkdownRenderer !== 'undefined') {
        this.markdownRenderer = new MarkdownRenderer();
    }
};

/**
 * Generate report based on selected date range
 */
ActivityTracker.prototype.generateReport = function() {
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;

    if (!startDate || !endDate) {
        showNotification('Please select both start and end dates', 'error');
        return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filteredEntries = this.entries.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= start && entryDate <= end;
    });

    this.currentReportEntries = filteredEntries;
    this.displayReport(filteredEntries, start, end);
};

/**
 * Display report in the UI
 * @param {Array} entries - Filtered entries
 * @param {Date} startDate - Report start date
 * @param {Date} endDate - Report end date
 */
ActivityTracker.prototype.displayReport = function(entries, startDate, endDate) {
    const container = document.getElementById('reportResults');

    // Initialize markdown renderer if not already done
    if (!this.markdownRenderer && typeof MarkdownRenderer !== 'undefined') {
        this.initMarkdownRenderer();
    }

    if (entries.length === 0) {
        container.innerHTML = `
            <div class="report-summary">
                <h3>No entries found for the selected period</h3>
                <p>From ${formatDate(startDate)} to ${formatDate(endDate)}</p>
            </div>
        `;
        return;
    }

    const entriesByDate = {};
    entries.forEach(entry => {
        const date = new Date(entry.timestamp).toDateString();
        if (!entriesByDate[date]) {
            entriesByDate[date] = [];
        }
        entriesByDate[date].push(entry);
    });

    const totalEntries = entries.length;
    const daysWithEntries = Object.keys(entriesByDate).length;
    const averageEntriesPerDay = (totalEntries / daysWithEntries).toFixed(1);

    container.innerHTML = `
        <div class="report-format-tabs">
            <button class="format-tab active" onclick="tracker.showReportFormat('html')">HTML View</button>
            <button class="format-tab" onclick="tracker.showReportFormat('markdown')">Markdown Preview</button>
        </div>
        
        <div id="htmlReport" class="report-format-content">
            ${this.generateHTMLReportContent(entries, startDate, endDate, entriesByDate, totalEntries, daysWithEntries, averageEntriesPerDay)}
        </div>
        
        <div id="markdownReport" class="report-format-content" style="display: none;">
            <div class="markdown-preview" id="markdownPreview">
                Loading markdown preview...
            </div>
        </div>
    `;
    
    // Generate markdown preview asynchronously to avoid blocking
    setTimeout(() => {
        this.updateMarkdownPreview(entries, startDate, endDate);
    }, 100);
};

/**
 * Generate HTML report content
 */
ActivityTracker.prototype.generateHTMLReportContent = function(entries, startDate, endDate, entriesByDate, totalEntries, daysWithEntries, averageEntriesPerDay) {
    return `
        <div class="report-summary">
            <h3>Activity Report</h3>
            <p><strong>Period:</strong> ${formatDate(startDate)} to ${formatDate(endDate)}</p>
            <p><strong>Total Entries:</strong> ${totalEntries}</p>
            <p><strong>Active Days:</strong> ${daysWithEntries}</p>
            <p><strong>Average Entries per Day:</strong> ${averageEntriesPerDay}</p>
        </div>
        
        ${Object.entries(entriesByDate)
            .sort(([a], [b]) => new Date(b) - new Date(a))
            .map(([date, dayEntries]) => `
                <div class="entry-item">
                    <div class="entry-content">
                        <div class="entry-time"><strong>${date}</strong> (${dayEntries.length} entries)</div>
                        ${dayEntries
                            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                            .map(entry => `
                                <div style="margin-left: 20px; margin-top: 10px;">
                                    <div class="entry-time">${formatTime(entry.timestamp)}</div>
                                    <div class="entry-activity">${escapeHtml(entry.activity)}</div>
                                    ${entry.description ? `<div class="entry-description">${this.renderDescriptionMarkdown(entry.description)}</div>` : ''}
                                </div>
                            `).join('')}
                    </div>
                </div>
            `).join('')}
    `;
};

/**
 * Update markdown preview
 */
ActivityTracker.prototype.updateMarkdownPreview = function(entries, startDate, endDate) {
    if (!this.markdownRenderer) return;
    
    const markdownContent = this.generateMarkdownReport(entries, startDate, endDate);
    const htmlContent = this.markdownRenderer.renderWithClasses(markdownContent);
    
    const previewElement = document.getElementById('markdownPreview');
    if (previewElement) {
        previewElement.innerHTML = htmlContent;
    }
};

/**
 * Show different report format
 * @param {string} format - Format to show ('html' or 'markdown')
 */
ActivityTracker.prototype.showReportFormat = function(format) {
    // Update tabs
    document.querySelectorAll('.format-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[onclick*="'${format}'"]`).classList.add('active');
    
    // Update content
    document.querySelectorAll('.report-format-content').forEach(content => {
        content.style.display = 'none';
    });
    
    const targetContent = document.getElementById(`${format}Report`);
    if (targetContent) {
        targetContent.style.display = 'block';
    }
};

/**
 * Set report to current week (Monday to Friday)
 */
ActivityTracker.prototype.setWeeklyReport = function() {
    const now = new Date();
    const monday = getWeekStart(now);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    this.currentWeekStart = new Date(monday);
    this.updateWeekDisplay();

    document.getElementById('reportStartDate').value = monday.toISOString().split('T')[0];
    document.getElementById('reportEndDate').value = friday.toISOString().split('T')[0];
};

/**
 * Navigate to previous week
 */
ActivityTracker.prototype.previousWeek = function() {
    if (!this.currentWeekStart) {
        this.setWeeklyReport();
        return;
    }

    this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
    this.updateWeekFromCurrent();
};

/**
 * Navigate to next week
 */
ActivityTracker.prototype.nextWeek = function() {
    if (!this.currentWeekStart) {
        this.setWeeklyReport();
        return;
    }

    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
    this.updateWeekFromCurrent();
};

/**
 * Update date inputs from current week start
 */
ActivityTracker.prototype.updateWeekFromCurrent = function() {
    const monday = new Date(this.currentWeekStart);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    document.getElementById('reportStartDate').value = monday.toISOString().split('T')[0];
    document.getElementById('reportEndDate').value = friday.toISOString().split('T')[0];
    
    this.updateWeekDisplay();
};

/**
 * Update week display text
 */
ActivityTracker.prototype.updateWeekDisplay = function() {
    if (!this.currentWeekStart) return;
    
    const monday = new Date(this.currentWeekStart);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const weekText = `Week of ${monday.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short' 
    })} - ${sunday.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
    })}`;
    
    document.getElementById('weekDisplay').textContent = weekText;
};

/**
 * Download report in selected format
 */
ActivityTracker.prototype.downloadReport = function() {
    const format = document.getElementById('downloadFormat').value;
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;

    if (!startDate || !endDate) {
        showNotification('Please generate a report first', 'error');
        return;
    }

    if (this.currentReportEntries.length === 0) {
        showNotification('No entries to download. Generate a report first.', 'error');
        return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    let content, filename, mimeType;

    switch (format) {
        case 'html':
            content = this.generateHTMLReport(this.currentReportEntries, start, end);
            filename = `activity-report-${startDate}-to-${endDate}.html`;
            mimeType = 'text/html';
            break;
        case 'markdown':
            content = this.generateMarkdownReport(this.currentReportEntries, start, end);
            filename = `activity-report-${startDate}-to-${endDate}.md`;
            mimeType = 'text/markdown';
            break;
        case 'csv':
            content = this.generateCSVReport(this.currentReportEntries, start, end);
            filename = `activity-report-${startDate}-to-${endDate}.csv`;
            mimeType = 'text/csv';
            break;
        default:
            showNotification('Unknown format selected', 'error');
            return;
    }

    downloadFile(content, filename, mimeType);
    showNotification(`Report downloaded as ${format.toUpperCase()}`, 'success');
};

/**
 * Generate HTML report
 * @param {Array} entries - Report entries
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {string} HTML content
 */
ActivityTracker.prototype.generateHTMLReport = function(entries, startDate, endDate) {
    const entriesByDate = {};
    entries.forEach(entry => {
        const date = new Date(entry.timestamp).toDateString();
        if (!entriesByDate[date]) {
            entriesByDate[date] = [];
        }
        entriesByDate[date].push(entry);
    });

    return `<!DOCTYPE html>
<html lang="en-GB">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Activity Report</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px; 
            line-height: 1.6;
        }
        .header { 
            background: #667eea; 
            color: white; 
            padding: 20px; 
            border-radius: 8px; 
            margin-bottom: 20px; 
        }
        .summary { 
            background: #e6fffa; 
            padding: 15px; 
            border-radius: 8px; 
            margin-bottom: 20px; 
            border-left: 4px solid #38b2ac; 
        }
        .day-section { 
            background: #f7fafc; 
            padding: 15px; 
            margin-bottom: 15px; 
            border-radius: 8px; 
            border: 1px solid #e2e8f0; 
        }
        .entry { 
            margin: 10px 0; 
            padding: 10px; 
            background: white; 
            border-radius: 4px; 
            border-left: 3px solid #667eea;
        }
        .time { 
            font-weight: 600; 
            color: #667eea; 
            font-size: 14px;
        }
        .activity { 
            font-size: 16px; 
            margin: 5px 0; 
            font-weight: 500;
        }
        .description { 
            color: #718096; 
            font-size: 14px; 
            font-style: italic;
        }
        h1, h2, h3 { margin-top: 0; }
        @media print {
            .header { background: #333 !important; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Activity Report</h1>
        <p>Generated on ${new Date().toLocaleString('en-GB')}</p>
    </div>
    
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Period:</strong> ${formatDate(startDate)} to ${formatDate(endDate)}</p>
        <p><strong>Total Entries:</strong> ${entries.length}</p>
        <p><strong>Active Days:</strong> ${Object.keys(entriesByDate).length}</p>
        <p><strong>Average per Day:</strong> ${(entries.length / Object.keys(entriesByDate).length).toFixed(1)} entries</p>
    </div>

    ${Object.entries(entriesByDate)
        .sort(([a], [b]) => new Date(a) - new Date(b))
        .map(([date, dayEntries]) => `
            <div class="day-section">
                <h3>${date} (${dayEntries.length} entries)</h3>
                ${dayEntries
                    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                    .map(entry => `
                        <div class="entry">
                            <div class="time">${formatTime(entry.timestamp)}</div>
                            <div class="activity">${escapeHtml(entry.activity)}</div>
                            ${entry.description ? `<div class="description">${this.renderDescriptionMarkdown(entry.description)}</div>` : ''}
                        </div>
                    `).join('')}
            </div>
        `).join('')}

    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 14px;">
        <p>Generated by Activity Tracker on ${new Date().toLocaleString('en-GB')}</p>
    </footer>
</body>
</html>`;
};

/**
 * Generate Markdown report
 * @param {Array} entries - Report entries
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {string} Markdown content
 */
ActivityTracker.prototype.generateMarkdownReport = function(entries, startDate, endDate) {
    const entriesByDate = {};
    entries.forEach(entry => {
        const date = new Date(entry.timestamp).toDateString();
        if (!entriesByDate[date]) {
            entriesByDate[date] = [];
        }
        entriesByDate[date].push(entry);
    });

    let markdown = `# Activity Report\n\n`;
    markdown += `**Generated:** ${new Date().toLocaleString('en-GB')}\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- **Period:** ${formatDate(startDate)} to ${formatDate(endDate)}\n`;
    markdown += `- **Total Entries:** ${entries.length}\n`;
    markdown += `- **Active Days:** ${Object.keys(entriesByDate).length}\n`;
    markdown += `- **Average per Day:** ${(entries.length / Object.keys(entriesByDate).length).toFixed(1)} entries\n\n`;
    markdown += `---\n\n`;

    Object.entries(entriesByDate)
        .sort(([a], [b]) => new Date(a) - new Date(b))
        .forEach(([date, dayEntries]) => {
            markdown += `## ${date} (${dayEntries.length} entries)\n\n`;
            dayEntries
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                .forEach((entry, index) => {
                    markdown += `### ${index + 1}. ${formatTime(entry.timestamp)} - ${entry.activity}\n\n`;
                    if (entry.description) {
                        markdown += `> ${entry.description}\n\n`;
                    }
                });
            markdown += `---\n\n`;
        });

    markdown += `*Report generated by Activity Tracker on ${new Date().toLocaleString('en-GB')}*\n`;

    return markdown;
};

/**
 * Generate CSV report with duration calculations
 * @param {Array} entries - Report entries
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {string} CSV content
 */
ActivityTracker.prototype.generateCSVReport = function(entries, startDate, endDate) {
    let csv = 'Date,Time,Activity,Description,Duration (minutes),Next Activity Time,Capped Start,Capped End\n';

    const sortedEntries = entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const [workStartHour, workStartMin] = this.settings.startTime.split(':').map(Number);
    const [workEndHour, workEndMin] = this.settings.endTime.split(':').map(Number);

    sortedEntries.forEach((entry, index) => {
        const entryDate = new Date(entry.timestamp);
        const entryTime = formatTime(entry.timestamp);
        const date = entryDate.toLocaleDateString('en-GB');
        
        let durationMinutes = '';
        let nextActivityTime = '';
        let cappedStart = formatTime(entry.timestamp);
        let cappedEnd = '';

        // Calculate duration to next activity or end of work day
        if (index < sortedEntries.length - 1) {
            const nextEntry = new Date(sortedEntries[index + 1].timestamp);
            const currentEntryDate = entryDate.toDateString();
            const nextEntryDate = nextEntry.toDateString();
            
            if (currentEntryDate === nextEntryDate) {
                // Next entry is same day
                const durationMs = nextEntry.getTime() - entryDate.getTime();
                durationMinutes = Math.floor(durationMs / (1000 * 60));
                nextActivityTime = formatTime(nextEntry.toISOString());
                cappedEnd = nextActivityTime;
            } else {
                // Next entry is different day, cap to end of work day
                const endOfWorkDay = new Date(entryDate);
                endOfWorkDay.setHours(workEndHour, workEndMin, 0, 0);
                
                if (entryDate < endOfWorkDay) {
                    const durationMs = endOfWorkDay.getTime() - entryDate.getTime();
                    durationMinutes = Math.floor(durationMs / (1000 * 60));
                    cappedEnd = `${workEndHour.toString().padStart(2, '0')}:${workEndMin.toString().padStart(2, '0')}`;
                }
            }
        } else {
            // Last entry, cap to end of work day
            const endOfWorkDay = new Date(entryDate);
            endOfWorkDay.setHours(workEndHour, workEndMin, 0, 0);
            
            if (entryDate < endOfWorkDay) {
                const durationMs = endOfWorkDay.getTime() - entryDate.getTime();
                durationMinutes = Math.floor(durationMs / (1000 * 60));
                cappedEnd = `${workEndHour.toString().padStart(2, '0')}:${workEndMin.toString().padStart(2, '0')}`;
            }
        }

        // Check if entry starts before work day
        const startOfWorkDay = new Date(entryDate);
        startOfWorkDay.setHours(workStartHour, workStartMin, 0, 0);
        
        if (entryDate < startOfWorkDay) {
            cappedStart = `${workStartHour.toString().padStart(2, '0')}:${workStartMin.toString().padStart(2, '0')}`;
            // Recalculate duration if start was capped
            if (cappedEnd) {
                const cappedStartTime = new Date(entryDate);
                cappedStartTime.setHours(workStartHour, workStartMin, 0, 0);
                const endTime = cappedEnd === nextActivityTime ? 
                    new Date(sortedEntries[index + 1].timestamp) : 
                    new Date(entryDate).setHours(workEndHour, workEndMin, 0, 0);
                durationMinutes = Math.floor((endTime - cappedStartTime.getTime()) / (1000 * 60));
            }
        }

        csv += `${date},${entryTime},${escapeCsv(entry.activity)},${escapeCsv(entry.description || '')},${durationMinutes},${nextActivityTime},${cappedStart},${cappedEnd}\n`;
    });

    return csv;
};

console.log('📊 Reports module loaded');
