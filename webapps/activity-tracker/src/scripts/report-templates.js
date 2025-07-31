/**
 * Default report templates for the Activity Tracker.
 */
window.ReportTemplates = {
    'detailed-html': {
        name: 'Detailed Report (HTML)',
        description: 'A comprehensive HTML report with timings and full descriptions.',
        type: 'html',
        template: `<!DOCTYPE html>
<html lang="en-GB">
<head>
    <meta charset="UTF-8">
    <title>Activity Report: {{ report.startDate | date('dd/mm/yyyy') }} - {{ report.endDate | date('dd/mm/yyyy') }}</title>
    <style>
        body { font-family: sans-serif; line-height: 1.5; color: #333; }
        .report-container { max-width: 800px; margin: 20px auto; padding: 20px; border: 1px solid #ccc; border-radius: 8px; }
        .report-header { text-align: center; border-bottom: 2px solid #667eea; padding-bottom: 10px; margin-bottom: 20px; }
        .report-summary { background: #f0f2ff; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .day-group { margin-bottom: 20px; }
        .day-header { font-size: 1.2em; font-weight: bold; color: #667eea; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; }
        .entry { margin-bottom: 10px; padding-left: 15px; border-left: 3px solid #ccc; }
        .entry-time { font-weight: bold; }
        .entry-activity { font-size: 1.1em; }
        .entry-description { color: #555; font-style: italic; }
        .duration { font-size: 0.9em; color: #888; }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="report-header">
            <h1>Activity Report</h1>
            <p>{{ report.startDate | date('dd mmm yyyy') }} to {{ report.endDate | date('dd mmm yyyy') }}</p>
        </div>
        <div class="report-summary">
            <h3>Report Summary</h3>
            <p><strong>Total Entries:</strong> {{ report.totalEntries }}</p>
            <p><strong>Total Duration:</strong> {{ report.totalDuration | duration }}</p>
            <p><strong>Active Days:</strong> {{ report.activeDays }}</p>
        </div>
        
        {{#each day = days}}
        <div class="day-group">
            <h2 class="day-header">{{ day.date }} ({{ day.entries.length }} entries, {{ day.totalDuration | duration }})</h2>
            {{#each entry = day.entries}}
            <div class="entry">
                <p><span class="entry-time">{{ entry.timestamp | time }}</span>: <span class="entry-activity">{{ entry.activity | escapeHtml }}</span></p>
                {{#if entry.description}}
                <div class="entry-description">{{ entry.description | markdown }}</div>
                {{/if}}
                <p class="duration">Duration: {{ entry.duration | duration }}</p>
            </div>
            {{/each}}
        </div>
        {{/each}}
    </div>
</body>
</html>`
    },
    'summary-markdown': {
        name: 'Summary (Markdown)',
        description: 'A summary report in Markdown, suitable for pasting into documents.',
        type: 'markdown',
        template: `# Activity Report

**Period:** {{ report.startDate | date('dd mmm yyyy') }} to {{ report.endDate | date('dd mmm yyyy') }}

## Summary
- **Total Entries:** {{ report.totalEntries }}
- **Total Duration:** {{ report.totalDuration | duration }}
- **Active Days:** {{ report.activeDays }}

---

{{#each day = days}}
## {{ day.date }} (Total: {{ day.totalDuration | duration }})
{{#each entry = day.entries}}
- **{{ entry.timestamp | time }} ({{ entry.duration | duration }})**: {{ entry.activity }}
{{/each}}
{{/each}}`
    },
    'basic-csv': {
        name: 'Basic Export (CSV)',
        description: 'A simple CSV file with core activity data.',
        type: 'csv',
        template: `Date,Time,Activity,Description
{{#each entry = entries}}{{ entry.timestamp | date('yyyy-mm-dd') }},{{ entry.timestamp | time }},{{ entry.activity | escapeCsv | stripLinebreaks }},{{ entry.description | escapeCsv | stripLinebreaks }}
{{/each}}`
    },
    'timed-csv': {
        name: 'Timed Export (CSV)',
        description: 'A detailed CSV file including calculated durations.',
        type: 'csv',
        template: `Date,StartTime,EndTime,DurationMinutes,Activity,Description
{{#each entry = entries}}{{ entry.timestamp | date('yyyy-mm-dd') }},{{ entry.timestamp | time }},{{ entry.endTime | time }},{{ entry.duration }},"{{ entry.activity | escapeCsv | stripLinebreaks }}","{{ entry.description | escapeCsv | stripLinebreaks }}"
{{/each}}`
    }
};
