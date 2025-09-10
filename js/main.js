// SovereignSwitch - Safe AI for Australia - JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Navigation functionality
    const navLinks = document.querySelectorAll('.nav a');
    const sections = document.querySelectorAll('.section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links and sections
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Show corresponding section
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
                // Show dashboard section if it's hidden
                if (targetId === 'dashboard') {
                    targetSection.style.display = 'block';
                }
            }
        });
    });
    
    // Dashboard link functionality
    const dashboardLink = document.querySelector('.dashboard-link');
    const signinBtn = document.querySelector('.signin-btn');
    
    function showDashboard() {
        console.log('showDashboard called');
        // Hide all main sections
        const hero = document.querySelector('.hero');
        const workflow = document.querySelector('.workflow');
        const features = document.querySelector('.features');
        const pricing = document.querySelector('.pricing');
        const docs = document.querySelector('.docs');
        const sovereign = document.querySelector('.sovereign-ai');

        if (hero) hero.style.display = 'none';
        if (workflow) workflow.style.display = 'none';
        if (features) features.style.display = 'none';
        if (pricing) pricing.style.display = 'none';
        if (docs) docs.style.display = 'none';
        if (sovereign) sovereign.style.display = 'none';
        
        // Show dashboard
        const dashboard = document.getElementById('dashboard');
        if (dashboard) {
            dashboard.style.display = 'block';
            dashboard.classList.add('active');
            // Ensure the first dashboard inner section is active
            const firstSection = document.getElementById('dashboard-overview');
            if (firstSection) firstSection.classList.add('active');
            // Scroll into view for immediate visibility
            dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        // Update navigation
        navLinks.forEach(l => l.classList.remove('active'));
        const dashboardNavLink = document.querySelector('.dashboard-link');
        if (dashboardNavLink) {
            dashboardNavLink.classList.add('active');
        }
    }
    
    if (dashboardLink) {
        dashboardLink.addEventListener('click', function(e) {
            e.preventDefault();
            showDashboard();
        });
    }
    
    if (signinBtn) {
        signinBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showDashboard();
        });
    }
    
    // Sidebar navigation functionality
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const dashboardSections = document.querySelectorAll('.dashboard-section');
    
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all sidebar links and sections
            sidebarLinks.forEach(l => l.classList.remove('active'));
            dashboardSections.forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Show corresponding section
            const targetSection = this.getAttribute('data-section');
            const targetElement = document.getElementById(targetSection);
            if (targetElement) {
                targetElement.classList.add('active');
            }
        });
    });
    
    // Deep-link and hash navigation to dashboard sections (e.g. #cost-optimisation)
    function activateDashboardSection(sectionId) {
        if (!sectionId) return;
        const targetElement = document.getElementById(sectionId);
        if (!targetElement || !targetElement.classList.contains('dashboard-section')) return;

        // Ensure dashboard is visible
        showDashboard();

        // Activate target dashboard subsection
        dashboardSections.forEach(s => s.classList.remove('active'));
        targetElement.classList.add('active');

        // Sync sidebar active state
        sidebarLinks.forEach(l => l.classList.remove('active'));
        const matchingSidebar = document.querySelector(`.sidebar-link[data-section="${sectionId}"]`);
        if (matchingSidebar) matchingSidebar.classList.add('active');

        // Initialize charts when switching to overview
        if (sectionId === 'dashboard-overview') {
            setTimeout(initializeCharts, 100);
        }

        // Scroll into view
        try { targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) {}
    }

    // Handle clicks on in-page anchors that point to dashboard sections but aren't sidebar links
    const internalAnchors = document.querySelectorAll('a[href^="#"]:not(.sidebar-link)');
    internalAnchors.forEach(a => {
        a.addEventListener('click', function(e) {
            const hash = this.getAttribute('href');
            const id = hash ? hash.replace('#', '') : '';
            const elem = document.getElementById(id);
            if (elem && elem.classList.contains('dashboard-section')) {
                e.preventDefault();
                activateDashboardSection(id);
                // Update hash without jumping
                if (history && history.pushState) {
                    history.pushState(null, '', '#' + id);
                }
            }
        });
    });

    // Activate section from existing hash on load, if applicable
    if (window.location.hash) {
        activateDashboardSection(window.location.hash.substring(1));
    }

    // Keep hash navigation in sync if the hash changes later
    window.addEventListener('hashchange', function() {
        activateDashboardSection(window.location.hash.substring(1));
    });
    
    // Logout functionality
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Hide dashboard and show landing page
            const dashboard = document.getElementById('dashboard');
            if (dashboard) dashboard.style.display = 'none';
            const hero = document.querySelector('.hero');
            const workflow = document.querySelector('.workflow');
            const features = document.querySelector('.features');
            const pricing = document.querySelector('.pricing');
            const docs = document.querySelector('.docs');
            const sovereign = document.querySelector('.sovereign-ai');
            if (hero) hero.style.display = 'block';
            if (workflow) workflow.style.display = 'block';
            if (features) features.style.display = 'block';
            if (pricing) pricing.style.display = 'block';
            if (docs) docs.style.display = 'block';
            if (sovereign) sovereign.style.display = 'block';
            
            // Reset navigation
            navLinks.forEach(l => l.classList.remove('active'));
        });
    }
    
    // Tab functionality for Company Setup section
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Show corresponding content
            const targetContent = document.getElementById(targetTab + '-tab');
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
    
    // Simulate real-time updates for dashboard metrics
    function updateMetrics() {
        const metricValues = document.querySelectorAll('.metric-value');
        metricValues.forEach(metric => {
            if (metric.textContent.includes(',')) {
                // Add some random variation to simulate real-time updates
                const currentValue = parseInt(metric.textContent.replace(/,/g, ''));
                const variation = Math.floor(Math.random() * 100) - 50;
                const newValue = Math.max(0, currentValue + variation);
                metric.textContent = newValue.toLocaleString();
            }
        });
    }
    
    // Update metrics every 30 seconds
    setInterval(updateMetrics, 30000);
    
    // Add hover effects to cards
    const cards = document.querySelectorAll('.metric-card, .policy-card, .compliance-card, .cost-card, .security-card, .settings-card, .feature-card, .pricing-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        });
    });
    
    // Simulate chart loading
    const chartPlaceholders = document.querySelectorAll('.chart-placeholder');
    chartPlaceholders.forEach(chart => {
        chart.addEventListener('click', function() {
            this.innerHTML = '<i class="fas fa-chart-line"></i><p>Chart would load here in production</p>';
        });
    });
    
    // Add loading states to buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            if (this.classList.contains('btn-primary') || this.classList.contains('btn-secondary')) {
                const originalText = this.innerHTML;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
                this.disabled = true;
                
                setTimeout(() => {
                    this.innerHTML = originalText;
                    this.disabled = false;
                }, 2000);
            }
        });
    });
    
    // Simulate search functionality
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const tableRows = document.querySelectorAll('.audit-table tbody tr');
            
            tableRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
    
    // Add tooltips to status badges
    const statusBadges = document.querySelectorAll('.status-badge');
    statusBadges.forEach(badge => {
        badge.addEventListener('mouseenter', function() {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = this.textContent + ' - Click for details';
            tooltip.style.cssText = `
                position: absolute;
                background: #333;
                color: white;
                padding: 0.5rem;
                border-radius: 3px;
                font-size: 0.8rem;
                z-index: 1000;
                pointer-events: none;
            `;
            document.body.appendChild(tooltip);
            
            const rect = this.getBoundingClientRect();
            tooltip.style.left = rect.left + 'px';
            tooltip.style.top = (rect.top - 30) + 'px';
            
            this.addEventListener('mouseleave', function() {
                document.body.removeChild(tooltip);
            });
        });
    });
    
    // Simulate real-time activity updates
    function addActivityItem() {
        const activities = [
            {
                icon: 'fas fa-shield-check',
                title: 'Risk Averted',
                description: 'PII detected - request diverted to secure model',
                time: 'Just now'
            },
            {
                icon: 'fas fa-ban',
                title: 'Request Blocked',
                description: 'Data residency violation prevented',
                time: '2 minutes ago'
            },
            {
                icon: 'fas fa-shield-alt',
                title: 'Bulk Request Detected',
                description: 'Suspicious pattern identified and quarantined',
                time: '5 minutes ago'
            }
        ];
        
        const randomActivity = activities[Math.floor(Math.random() * activities.length)];
        const activityList = document.querySelector('.activity-list');
        
        if (activityList) {
            const newActivity = document.createElement('div');
            newActivity.className = 'activity-item';
            newActivity.innerHTML = `
                <div class="activity-icon">
                    <i class="${randomActivity.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${randomActivity.title}</div>
                    <div class="activity-description">${randomActivity.description}</div>
                    <div class="activity-time">${randomActivity.time}</div>
                </div>
            `;
            
            activityList.insertBefore(newActivity, activityList.firstChild);
            
            // Remove oldest activity if more than 5 items
            const activities = activityList.querySelectorAll('.activity-item');
            if (activities.length > 5) {
                activityList.removeChild(activities[activities.length - 1]);
            }
        }
    }
    
    // Add new activity every 2 minutes
    setInterval(addActivityItem, 120000);
    
    // Collapsible sections functionality
    const policySectionHeaders = document.querySelectorAll('.policy-section-header');
    policySectionHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const content = document.getElementById(targetId);
            const toggleIcon = this.querySelector('.toggle-icon');
            
            if (content) {
                const isExpanded = content.classList.contains('show');
                
                // Toggle content visibility
                if (isExpanded) {
                    content.classList.remove('show');
                    this.setAttribute('aria-expanded', 'false');
                } else {
                    content.classList.add('show');
                    this.setAttribute('aria-expanded', 'true');
                }
                
                // Rotate toggle icon
                if (toggleIcon) {
                    toggleIcon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
                }
            }
        });
    });

    // Charts state
    let chartsInitialized = false;
    // Initialize charts when dashboard is shown
    function initializeCharts() {
        console.log('Initializing charts...');
        console.log('Chart.js available:', typeof Chart !== 'undefined');
        console.log('Dashboard visible:', document.getElementById('dashboard')?.style.display !== 'none');
        console.log('Charts already initialized:', chartsInitialized);
        
        // Prevent multiple initializations
        if (chartsInitialized) {
            console.log('Charts already initialized, skipping...');
            return;
        }
        
        // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return;
        }
        
        console.log('Chart.js is loaded, proceeding with chart initialization');
        
        // Model Usage Pie Chart
        const modelUsageCtx = document.getElementById('modelUsageChart');
        console.log('Model usage chart canvas:', modelUsageCtx);
        if (modelUsageCtx) {
            try {
                new Chart(modelUsageCtx, {
                type: 'doughnut',
                data: {
                    labels: ['GPT-4', 'Claude-3', 'Gemini Pro', 'Llama-2', 'Self-hosted'],
                    datasets: [{
                        data: [35, 25, 20, 12, 8],
                        backgroundColor: [
                            '#2a5298',
                            '#1e3c72',
                            '#4a90e2',
                            '#7bb3f0',
                            '#a8d0f0'
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 10,
                                font: { size: 10 }
                            }
                        }
                    }
                }
            });
            } catch (error) {
                console.error('Error initializing modelUsageChart:', error);
            }
        } else {
            console.warn('modelUsageChart canvas not found');
        }

        // Cost Efficiency Line Chart
        const costEfficiencyCtx = document.getElementById('costEfficiencyChart');
        console.log('Cost efficiency chart canvas:', costEfficiencyCtx);
        if (costEfficiencyCtx) {
            try {
                new Chart(costEfficiencyCtx, {
                type: 'line',
                data: {
                    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                    datasets: [{
                        label: 'Without Optimization',
                        data: [0.0045, 0.0048, 0.0052, 0.0049],
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        tension: 0.4
                    }, {
                        label: 'With Optimization',
                        data: [0.0038, 0.0032, 0.0035, 0.0032],
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: false,
                            min: 0.003,
                            max: 0.0055,
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toFixed(4);
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { font: { size: 10 } }
                        }
                    }
                }
            });
            } catch (error) {
                console.error('Error initializing costEfficiencyChart:', error);
            }
        } else {
            console.warn('costEfficiencyChart canvas not found');
        }

        // Usage Trends Stacked Bar Chart
        const usageTrendsCtx = document.getElementById('usageTrendsChart');
        if (usageTrendsCtx) {
            try {
                new Chart(usageTrendsCtx, {
                type: 'bar',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                        label: 'GPT-4',
                        data: [1200, 1350, 1100, 1400, 1600, 800, 600],
                        backgroundColor: '#2a5298'
                    }, {
                        label: 'Claude-3',
                        data: [800, 950, 700, 1000, 1200, 500, 400],
                        backgroundColor: '#1e3c72'
                    }, {
                        label: 'Gemini Pro',
                        data: [600, 750, 500, 800, 900, 300, 200],
                        backgroundColor: '#4a90e2'
                    }, {
                        label: 'Self-hosted',
                        data: [400, 450, 300, 500, 600, 200, 150],
                        backgroundColor: '#7bb3f0'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { stacked: true },
                        y: { stacked: true }
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { font: { size: 10 } }
                        }
                    }
                }
            });
            } catch (error) {
                console.error('Error initializing usageTrendsChart:', error);
            }
        } else {
            console.warn('usageTrendsChart canvas not found');
        }

        // Department Usage Chart
        const departmentUsageCtx = document.getElementById('departmentUsageChart');
        if (departmentUsageCtx) {
            try {
                new Chart(departmentUsageCtx, {
                type: 'bar',
                data: {
                    labels: ['Client Service', 'Risk Management', 'Operations', 'IT', 'Compliance'],
                    datasets: [{
                        label: 'Requests',
                        data: [4500, 3200, 2800, 2100, 1800],
                        backgroundColor: [
                            '#2a5298',
                            '#1e3c72',
                            '#4a90e2',
                            '#7bb3f0',
                            '#a8d0f0'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
            } catch (error) {
                console.error('Error initializing departmentUsageChart:', error);
            }
        } else {
            console.warn('departmentUsageChart canvas not found');
        }

        // Cost Analysis Chart
        const costAnalysisCtx = document.getElementById('costAnalysisChart');
        if (costAnalysisCtx) {
            try {
                new Chart(costAnalysisCtx, {
                type: 'line',
                data: {
                    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                    datasets: [{
                        label: 'Without Optimization',
                        data: [4500, 4800, 5200, 4900],
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        tension: 0.4,
                        fill: true
                    }, {
                        label: 'With Optimization',
                        data: [3800, 3200, 3500, 3200],
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { font: { size: 12 } }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': $' + context.parsed.y.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
            } catch (error) {
                console.error('Error initializing costAnalysisChart:', error);
            }
        } else {
            console.warn('costAnalysisChart canvas not found');
        }

        // Cost Breakdown Chart
        const costBreakdownCtx = document.getElementById('costBreakdownChart');
        if (costBreakdownCtx) {
            try {
                new Chart(costBreakdownCtx, {
                    type: 'pie',
                    data: {
                        labels: ['OpenAI', 'Anthropic', 'Google', 'Self-hosted', 'Others'],
                        datasets: [{
                            data: [45, 25, 15, 10, 5],
                            backgroundColor: [
                                '#2a5298',
                                '#1e3c72',
                                '#4a90e2',
                                '#7bb3f0',
                                '#a8d0f0'
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: { font: { size: 10 } }
                            }
                        }
                    }
                });
            } catch (error) {
                console.error('Error initializing costBreakdownChart:', error);
            }
        }

        // Savings Chart
        const savingsCtx = document.getElementById('savingsChart');
        if (savingsCtx) {
            try {
                new Chart(savingsCtx, {
                    type: 'line',
                    data: {
                        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                        datasets: [{
                            label: 'Savings (AUD)',
                            data: [200, 450, 380, 520],
                            borderColor: '#28a745',
                            backgroundColor: 'rgba(40, 167, 69, 0.1)',
                            tension: 0.4,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return '$' + value;
                                    }
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: { font: { size: 10 } }
                            }
                        }
                    }
                });
            } catch (error) {
                console.error('Error initializing savingsChart:', error);
            }
        }

        // Department Spend Chart
        const departmentSpendCtx = document.getElementById('departmentSpendChart');
        if (departmentSpendCtx) {
            try {
                new Chart(departmentSpendCtx, {
                    type: 'bar',
                    data: {
                        labels: ['Client Service', 'Risk Management', 'Operations', 'IT', 'Compliance'],
                        datasets: [{
                            label: 'Spend (AUD)',
                            data: [1200, 950, 800, 600, 400],
                            backgroundColor: [
                                '#2a5298',
                                '#1e3c72',
                                '#4a90e2',
                                '#7bb3f0',
                                '#a8d0f0'
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return '$' + value;
                                    }
                                }
                            }
                        },
                        plugins: {
                            legend: { display: false }
                        }
                    }
                });
            } catch (error) {
                console.error('Error initializing departmentSpendChart:', error);
            }
        }

        // Forecast Chart
        const forecastCtx = document.getElementById('forecastChart');
        if (forecastCtx) {
            try {
                new Chart(forecastCtx, {
                    type: 'line',
                    data: {
                        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                        datasets: [{
                            label: 'Actual Spend',
                            data: [1200, 1900, 3000, 5000, 4200, 3800],
                            borderColor: '#007bff',
                            backgroundColor: 'rgba(0, 123, 255, 0.1)',
                            tension: 0.4
                        }, {
                            label: 'Forecast',
                            data: [1200, 1900, 3000, 5000, 4200, 3800, 4500, 5200],
                            borderColor: '#dc3545',
                            backgroundColor: 'rgba(220, 53, 69, 0.1)',
                            borderDash: [5, 5],
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return '$' + value;
                                    }
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: { font: { size: 10 } }
                            }
                        }
                    }
                });
            } catch (error) {
                console.error('Error initializing forecastChart:', error);
            }
        }
        
        chartsInitialized = true;
        console.log('Chart initialization completed');
    }

    // Click handler functions
    window.showComplianceDetails = function() {
        alert('Compliance Details:\n\n• APRA CPS 234: 100% compliant\n• SOCI Act: 98.7% compliant\n• Privacy Act: 99.2% compliant\n\nLast audit: 2 weeks ago\nNext review: Due in 6 weeks');
    };

    window.showRiskDetails = function() {
        alert('Risk Details:\n\n• PII Detection: 1,234 requests diverted\n• Data Residency: 892 violations blocked\n• Bulk Requests: 721 patterns detected\n• Total Savings: $45,230 in potential fines\n\nRisk Score: Low (2.3/10)');
    };

    window.showActivityDetails = function(type) {
        const details = {
            'risk-averted': 'Risk Averted Details:\n\n• 47 requests contained PII\n• Automatically diverted to self-hosted model\n• No data left Australian jurisdiction\n• Compliance maintained at 100%',
            'request-blocked': 'Request Blocked Details:\n\n• Attempted routing to US servers\n• Blocked by data residency rules\n• Request logged for audit\n• Alternative AU-hosted model suggested',
            'policy-update': 'Policy Update Details:\n\n• APRA CPS 234 rules updated\n• New encryption requirements added\n• All active sessions refreshed\n• Compliance score improved to 98.7%'
        };
        alert(details[type] || 'Activity details not available');
    };

    // Initialize charts when dashboard is shown
    const originalShowDashboard = showDashboard;
    showDashboard = function() {
        originalShowDashboard();
        // Use a longer delay to ensure DOM is fully ready
        setTimeout(() => {
            initializeCharts();
        }, 500);
    };
    
    // Don't initialize charts on page load - only when dashboard is shown

    // Initialize dashboard with some sample data
    console.log('AuzGuard Dashboard initialized');
    console.log('This is a wireframe demonstration - no actual functionality is implemented');
    
    // Simulation functionality
    function initializeSimulation() {
        console.log('Simulation module initialized');
    }
    
    // Global function for running simulations
    window.runSimulation = function() {
        console.log('Running simulation...');
        
        // Simulate API call processing
        const steps = document.querySelectorAll('.flow-step');
        steps.forEach((step, index) => {
            setTimeout(() => {
                step.style.opacity = '0.7';
                step.style.transform = 'scale(0.98)';
                
                setTimeout(() => {
                    step.style.opacity = '1';
                    step.style.transform = 'scale(1)';
                }, 200);
            }, index * 500);
        });
        
        // Show success message
        setTimeout(() => {
            alert('Simulation completed successfully! All compliance checks passed.');
        }, steps.length * 500 + 500);
    };

    // Audit Trail functionality
    window.searchLogs = function() {
        const searchTerm = document.getElementById('log-search').value;
        const logTable = document.querySelector('.log-table tbody');
        const rows = logTable.querySelectorAll('tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            if (text.includes(searchTerm.toLowerCase())) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    };

    window.filterLogs = function() {
        const userFilter = document.getElementById('log-user').value;
        const statusFilter = document.getElementById('log-status').value;
        const logTable = document.querySelector('.log-table tbody');
        const rows = logTable.querySelectorAll('tr');
        
        rows.forEach(row => {
            const userCell = row.cells[1].textContent;
            const statusCell = row.cells[5].textContent;
            
            let showRow = true;
            
            if (userFilter !== 'all' && !userCell.toLowerCase().includes(userFilter.toLowerCase())) {
                showRow = false;
            }
            
            if (statusFilter !== 'all' && !statusCell.toLowerCase().includes(statusFilter.toLowerCase())) {
                showRow = false;
            }
            
            row.style.display = showRow ? '' : 'none';
        });
    };

    // Threat Detection functionality
    window.quarantineThreat = function(threatId) {
        if (confirm('Are you sure you want to quarantine this threat?')) {
            // Simulate quarantine action
            const threatRow = document.querySelector(`[data-threat-id="${threatId}"]`);
            if (threatRow) {
                threatRow.style.opacity = '0.5';
                threatRow.style.backgroundColor = '#f8d7da';
                
                // Update status
                const statusCell = threatRow.querySelector('.status-badge');
                if (statusCell) {
                    statusCell.textContent = 'Quarantined';
                    statusCell.className = 'status-badge warning';
                }
                
                alert('Threat has been quarantined successfully.');
            }
        }
    };

    window.investigateThreat = function(threatId) {
        // Simulate investigation action
        alert('Investigation initiated. Security team has been notified.');
    };

    // Team Members functionality
    window.addTeamMember = function() {
        const emailInput = document.querySelector('input[type="email"]');
        const email = emailInput.value;
        
        if (email && email.includes('@')) {
            // Simulate adding user
            alert(`User ${email} has been added successfully.`);
            emailInput.value = '';
        } else {
            alert('Please enter a valid email address.');
        }
    };

    window.rotateApiKey = function(keyName) {
        if (confirm(`Are you sure you want to rotate the API key "${keyName}"?`)) {
            alert(`API key "${keyName}" has been rotated successfully. New key has been generated.`);
        }
    };

    window.renewApiKey = function(keyName) {
        if (confirm(`Are you sure you want to renew the API key "${keyName}"?`)) {
            alert(`API key "${keyName}" has been renewed successfully.`);
        }
    };

    // File upload functionality
    document.addEventListener('change', function(e) {
        if (e.target.type === 'file') {
            const fileName = e.target.files[0]?.name || 'No file selected';
            const fileLabel = e.target.nextElementSibling;
            if (fileLabel) {
                fileLabel.textContent = fileName;
            }
        }
    });

    // Initialize additional charts for new sections
    function initializeAdditionalCharts() {
        // Historical Spend Chart
        const historicalSpendCtx = document.getElementById('historicalSpendChart');
        if (historicalSpendCtx && typeof Chart !== 'undefined') {
            try {
                new Chart(historicalSpendCtx, {
                    type: 'line',
                    data: {
                        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                        datasets: [{
                            label: 'Spend (AUD)',
                            data: [1200, 1900, 3000, 5000, 4200, 3800],
                            borderColor: '#007bff',
                            backgroundColor: 'rgba(0, 123, 255, 0.1)',
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                display: false
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return '$' + value.toLocaleString();
                                    }
                                }
                            }
                        }
                    }
                });
                console.log('Historical spend chart initialized successfully');
            } catch (error) {
                console.error('Error initializing historical spend chart:', error);
            }
        } else if (historicalSpendCtx) {
            console.warn('Historical spend chart canvas not found');
        }
    }

    // Initialize additional charts and core charts when dashboard loads
    // (This runs within the main DOMContentLoaded handler)
    setTimeout(initializeAdditionalCharts, 1000);
    const dashboardEl = document.getElementById('dashboard');
    try {
        const isVisible = dashboardEl && (getComputedStyle(dashboardEl).display !== 'none');
        if (isVisible) {
            setTimeout(initializeCharts, 300);
        }
    } catch (_) {}
});

// Model Garden functionality
(function(){
    function initModelGarden() {
        const tabs = document.querySelectorAll('.category-tab');
        const cards = document.querySelectorAll('.model-card');
        if (!tabs.length || !cards.length) return;
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const category = tab.getAttribute('data-category');
                cards.forEach(card => {
                    const cardCat = card.getAttribute('data-category');
                    const show = category === 'all' || cardCat === category;
                    card.style.display = show ? '' : 'none';
                });
            });
        });

        // Hook up authorization toggles to show a confirmation
        document.querySelectorAll('.model-card .toggle-label input[type="checkbox"]').forEach(input => {
            input.addEventListener('change', (e) => {
                const card = e.target.closest('.model-card');
                const name = card ? card.querySelector('.model-info h4')?.textContent : 'Model';
                const enabled = e.target.checked;
                console.log(`${name} authorization ${enabled ? 'enabled' : 'disabled'}`);
            });
        });
    }

    document.addEventListener('DOMContentLoaded', function(){
        setTimeout(initModelGarden, 500);
    });
})();
