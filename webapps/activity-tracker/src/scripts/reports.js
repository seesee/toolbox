/**
 * Reports functionality for Activity Tracker.
 * This version manually processes loops before sending to the templating engine.
 */
Object.assign(ActivityTracker.prototype, {
    
    /**
     * Initializes the report section, populating the template selector.
     */
    initReportTemplates() {
        this.templatingEngine = new TemplatingEngine();
        const templateSelector = document.getElementById('reportTemplate');
        if (!templateSelector) return;

        const templates = this.getReportTemplates();
        templateSelector.innerHTML = Object.keys(templates).map(key => 
            `<option value="${key}">${templates[key].name}</option>`
        ).join('');
    },

    /**
     * Prepares the data from entries for use in report templates.
     * @param {Array} entries - The raw activity entries.
     * @param {Date} startDate - The start date of the report.
     * @param {Date} endDate - The end date of the report.
     * @returns {object} A structured data object for the templating engine.
     */
    prepareReportData(entries, startDate, endDate) {
        console.log('Preparing report data with entries:', entries);
        
        const sortedEntries = [...entries].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        console.log('Sorted entries:', sortedEntries);
        
        const processedEntries = sortedEntries.map((entry, index) => {
            console.log('Processing entry:', entry);
            
            if (!entry.timestamp) {
                console.error('Entry missing timestamp:', entry);
            }
            
            const nextEntry = sortedEntries[index + 1];
            let endTime, duration;

            if (nextEntry) {
                endTime = new Date(nextEntry.timestamp);
                duration = Math.round((endTime - new Date(entry.timestamp)) / 60000);
            } else {
                const endOfDay = new Date(entry.timestamp);
                const [endHour, endMin] = this.settings.endTime.split(':').map(Number);
                endOfDay.setHours(endHour, endMin, 0, 0);
                endTime = new Date(Math.min(new Date(), endOfDay));
                duration = Math.round((endTime - new Date(entry.timestamp)) / 60000);
            }

            const processedEntry = { ...entry, endTime, duration };
            console.log('Processed entry:', processedEntry);
            return processedEntry;
        });

        const entriesByDate = {};
        processedEntries.forEach(entry => {
            const date = new Date(entry.timestamp).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            if (!entriesByDate[date]) {
                entriesByDate[date] = { entries: [], totalDuration: 0 };
            }
            entriesByDate[date].entries.push(entry);
            entriesByDate[date].totalDuration += entry.duration > 0 ? entry.duration : 0;
        });

        const days = Object.keys(entriesByDate).map(date => ({
            date,
            entries: entriesByDate[date].entries,
            totalDuration: entriesByDate[date].totalDuration
        }));

        console.log('Final days structure:', days);

        const totalDuration = days.reduce((sum, day) => sum + day.totalDuration, 0);

        return {
            report: {
                startDate,
                endDate,
                generatedDate: new Date(),
                totalEntries: processedEntries.length,
                totalDuration,
                activeDays: days.length,
            },
            days: days,
            entries: processedEntries
        };
    },

    /**
     * Manually processes a template with loops.
     * @param {string} templateString - The template string.
     * @param {object} data - The report data.
     * @returns {string} The fully rendered report.
     */
    renderReport(templateString, data) {
        // Use the templating engine's built-in loop processing
        return this.templatingEngine.render(templateString, data);
    },

    /**
     * Generate and display a report based on the selected date range.
     */
    generateReport() {
        const startDateInput = document.getElementById('reportStartDate').value;
        const endDateInput = document.getElementById('reportEndDate').value;

        if (!startDateInput || !endDateInput) {
            showNotification('Please select both start and end dates', 'error');
            return;
        }

        const start = new Date(startDateInput);
        const end = new Date(endDateInput);
        end.setHours(23, 59, 59, 999);

        const filteredEntries = this.entries.filter(entry => {
            const entryDate = new Date(entry.timestamp);
            return entryDate >= start && entryDate <= end;
        });

        this.currentReportEntries = filteredEntries;
        this.currentReportData = this.prepareReportData(filteredEntries, start, end);
        
        this.previewReport();
    },

    /**
     * Render a preview of the selected report template.
     */
    previewReport() {
        const previewEl = document.getElementById('reportPreview');
        if (!previewEl) return;

        if (!this.currentReportData || this.currentReportEntries.length === 0) {
            previewEl.innerHTML = 'No data for the selected period. Generate a report first.';
            return;
        }

        const templateKey = document.getElementById('reportTemplate').value;
        const templates = this.getReportTemplates();
        const template = templates[templateKey];

        if (!template) {
            previewEl.textContent = 'Error: Selected report template not found.';
            return;
        }

        // Check which tab is active
        const renderedTab = document.getElementById('reportPreviewTabRendered');
        const isRenderedView = renderedTab && renderedTab.classList.contains('active');

        try {
            const renderedContent = this.renderReport(template.template, this.currentReportData);
            
            if (isRenderedView) {
                // Show rendered view
                if (template.type === 'html') {
                    previewEl.innerHTML = `<iframe srcdoc="${this.templatingEngine.escapeHtml(renderedContent)}" style="width: 100%; height: 450px; border: none;"></iframe>`;
                } else if (template.type === 'markdown' && this.markdownRenderer) {
                    // Render markdown to HTML
                    const htmlContent = this.markdownRenderer.render(renderedContent);
                    previewEl.innerHTML = htmlContent;
                } else {
                    // Show as formatted text
                    previewEl.innerHTML = `<pre>${this.templatingEngine.escapeHtml(renderedContent)}</pre>`;
                }
            } else {
                // Show source view
                previewEl.innerHTML = `<pre>${this.templatingEngine.escapeHtml(renderedContent)}</pre>`;
            }
        } catch (error) {
            previewEl.textContent = 'Error generating preview: ' + error.message;
        }
    },

    /**
     * Download the report using the selected template.
     */
    downloadReport() {
        if (!this.currentReportData || this.currentReportEntries.length === 0) {
            showNotification('Please generate a report with data first', 'error');
            return;
        }

        const templateKey = document.getElementById('reportTemplate').value;
        const templates = this.getReportTemplates();
        const template = templates[templateKey];
        const startDate = this.currentReportData.report.startDate;
        const endDate = this.currentReportData.report.endDate;

        const content = this.renderReport(template.template, this.currentReportData);
        
        const fileExtension = template.type;
        const mimeType = {
            html: 'text/html',
            markdown: 'text/markdown',
            csv: 'text/csv'
        }[fileExtension] || 'text/plain';

        const filename = `activity-report-${this.templatingEngine.formatDate(startDate, 'yyyy-mm-dd')}-to-${this.templatingEngine.formatDate(endDate, 'yyyy-mm-dd')}.${fileExtension}`;

        downloadFile(content, filename, mimeType);
        showNotification(`Report downloaded as ${template.name}`, 'success');
    },

    /**
     * Set report to the current week.
     */
    setWeeklyReport() {
        const now = new Date();
        this.currentWeekStart = getWeekStart(now);
        this.updateWeekFromCurrent();
        this.generateReport();
    },

    /**
     * Navigate to the previous week.
     */
    previousWeek() {
        if (!this.currentWeekStart) this.currentWeekStart = getWeekStart(new Date());
        this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
        this.updateWeekFromCurrent();
        this.generateReport();
    },

    /**
     * Navigate to the next week.
     */
    nextWeek() {
        if (!this.currentWeekStart) this.currentWeekStart = getWeekStart(new Date());
        this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
        this.updateWeekFromCurrent();
        this.generateReport();
    },

    /**
     * Update date inputs from the current week start date.
     */
    updateWeekFromCurrent() {
        const monday = new Date(this.currentWeekStart);
        const sunday = getWeekEnd(monday);

        document.getElementById('reportStartDate').value = monday.toISOString().split('T')[0];
        document.getElementById('reportEndDate').value = sunday.toISOString().split('T')[0];
        
        this.updateWeekDisplay();
    },

    /**
     * Update the week display text.
     */
    updateWeekDisplay() {
        if (!this.currentWeekStart) return;
        
        const monday = new Date(this.currentWeekStart);
        const sunday = getWeekEnd(monday);

        const weekText = `Week of ${monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${sunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        
        document.getElementById('weekDisplay').textContent = weekText;
    }
});

// Helper functions for date calculations
function getWeekStart(d) {
    d = new Date(d);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
}

function getWeekEnd(d) {
    const start = getWeekStart(d);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end;
}
