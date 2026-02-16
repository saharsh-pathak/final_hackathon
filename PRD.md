# Product Requirements Document (PRD)
## TEMP AQI - Delhi Air Quality Monitoring & Mitigation System

**Project Name:** TEMP AQI  
**Platform:** Google Antigravity  
**Version:** 1.0  
**Date:** February 16, 2026  
**Target Audience:** Municipal Authorities & Government Officials

---

## Executive Summary

TEMP AQI is an IoT-based hyperlocal air quality monitoring and active mitigation system built on Google's Antigravity platform. It addresses Delhi's severe air pollution crisis by combining real-time PM2.5 monitoring with predictive analytics and automated water-mist intervention to demonstrably reduce localized AQI levels.

**Key Innovation:** Unlike passive monitoring systems, TEMP AQI actively reduces air pollution through data-driven sprinkler activation integrated with existing municipal water infrastructure.

---

## Problem Statement

Delhi consistently ranks among the world's most polluted cities, with AQI levels regularly exceeding hazardous thresholds (300+). Current solutions focus on monitoring or large-scale policy interventions, leaving a gap in **hyperlocal, immediate intervention capabilities**.

**Critical Issues:**
- Lack of granular, neighborhood-level AQI data
- No real-time intervention mechanisms
- Residents and authorities have limited actionable tools
- Existing monitoring systems are passive observers

---

## Solution Overview

### System Architecture

**4-Node Sensor Network:**
- Each node equipped with PM2.5 and humidity sensors
- Covers 0.5-1 sq km colony area (optimal density: 1 node per 0.25 sq km)
- Real-time data transmission to cloud platform

**Core Capabilities:**
1. **Real-time Monitoring:** Continuous PM2.5 and humidity tracking
2. **AQI Calculation:** Official CPCB government formula implementation
3. **Predictive Analytics:** 24-hour AQI forecasting using historical patterns
4. **Active Mitigation:** Automated sprinkler system triggering based on AQI thresholds
5. **Web Dashboard:** Real-time visualization built on Google Antigravity

### Water Mist Intervention System

**Integration Approach:**
- Connects to existing municipal water lines/RWA infrastructure
- Water atomization/mist generation (not traditional sprinklers)
- Algorithm-controlled activation based on:
  - Current AQI levels
  - Predicted AQI trends
  - Humidity conditions
  - Optimal water volume calculation

**Mechanism:**
- Fine water mist binds with PM2.5 particles
- Particles become heavier and settle
- Measurable localized AQI reduction

---

## Prototype Demonstration (Saturday, February 22, 2026)

### Scope

**Hardware:**
- 1 functional sensor node (ESP32 + PM2.5 sensor + Humidity sensor)
- 3 simulated nodes with realistic dummy data close to Node 1 actual values

**Software - Web Portal (Built with Google Antigravity):**

1. **Real-time Dashboard**
   - Live data feed from Node 1 (actual ESP32 hardware)
   - Simulated data from Nodes 2, 3, 4
   - Current AQI calculation and display for all 4 nodes
   - Color-coded air quality indicators:
     - Good (0-50) - Green
     - Satisfactory (51-100) - Light Green
     - Moderate (101-200) - Yellow
     - Poor (201-300) - Orange
     - Very Poor (301-400) - Red
     - Severe (401-500) - Maroon
   - Average colony AQI calculated from all 4 nodes
   - Node location map visualization

2. **24-Hour Prediction Module**
   - Time-series line graph showing predicted AQI
   - Hourly predictions for next 24 hours
   - Confidence intervals/prediction ranges
   - Alert thresholds highlighting when hazardous levels are expected
   - Color-coded prediction zones matching AQI categories
   - Comparison with current AQI trend

3. **Sprinkler Control Interface**
   - Current sprinkler system status (Active/Inactive)
   - AQI threshold settings for automatic activation
   - Manual trigger button for demonstration purposes
   - Recommended activation duration display
   - Estimated water volume calculation
   - Trigger history log showing:
     - Activation timestamp
     - Duration of spray
     - AQI before activation
     - AQI after activation (for completed cycles)
   - Safety parameters and limits display

**Technology Stack:**
- **Platform:** Google Antigravity (web portal framework)
- **Hardware:** ESP32 microcontroller
- **Sensors:** 
  - PM2.5: PMS5003/SDS011 particulate sensor
  - Humidity: DHT22 or similar
- **Communication:** WiFi with MQTT protocol for real-time data
- **Backend:** Cloud functions for data processing
- **Database:** Real-time database for sensor data storage

### Demo Deliverables

✅ Live sensor data streaming from ESP32 to Antigravity portal  
✅ Interactive dashboard with 4-node visualization  
✅ AQI calculation engine using official CPCB formula  
✅ 24-hour prediction graph (with simulated historical data)  
✅ Sprinkler trigger logic demonstration  
✅ Mock intervention scenario showing expected AQI reduction  

---

## Full System Vision (Post-Prototype)

### Phase 1: Pilot Deployment (3-6 months)
- Deploy 4 physical sensor nodes in selected Delhi colony (0.5-1 sq km)
- Install water mist system at 2-3 strategic locations
- Collect baseline data for 1 month (no intervention)
- Activate intervention system
- Measure AQI reduction impact with rigorous before/after analysis

### Phase 2: Data Collection & Optimization (Months 4-6)
- Refine prediction algorithm with real collected data
- Optimize sprinkler activation parameters:
  - Ideal activation duration
  - Optimal water volume
  - Frequency limits
  - Multi-parameter decision logic
- Document measurable AQI improvements
- Prepare detailed case study for municipal authorities
- Conduct cost-benefit analysis

### Phase 3: Scaling (Months 7-12)
- Expand to 5-10 colonies across different Delhi zones
- Partner with RWAs and municipal corporations
- Integrate with Delhi government's existing air quality monitoring network
- Seek government funding for city-wide deployment
- Open-source portions of the system for community contributions

---

## Technical Specifications

### Sensor Nodes

**Hardware Components:**
- **Microcontroller:** ESP32 (WiFi-enabled, dual-core processor)
- **PM2.5 Sensor:** PMS5003/SDS011 (±10 µg/m³ accuracy)
- **Humidity Sensor:** DHT22/BME280 (±2% RH accuracy)
- **Power:** Solar panel + Li-ion battery backup OR municipal power with UPS
- **Enclosure:** Weather-resistant IP65 rated housing
- **Mounting:** Pole-mounted at 3-4 meters height

**Data Collection:**
- Sampling interval: Every 5 minutes
- Data transmission: Real-time via WiFi/4G to cloud
- Local buffering: In case of connectivity loss
- Storage: Cloud-based real-time database

### AQI Calculation

Following **CPCB (Central Pollution Control Board)** standard formula:

```
AQI = max(AQI_PM2.5, AQI_PM10, AQI_NO2, AQI_SO2, AQI_CO, AQI_O3)
```

**For prototype (PM2.5 only):**
- Uses breakpoint interpolation method
- Standard AQI categories and color codes
- Calculation formula:

```
AQI = [(I_high - I_low) / (BP_high - BP_low)] × (C_p - BP_low) + I_low

Where:
I_high = AQI value corresponding to BP_high
I_low = AQI value corresponding to BP_low
BP_high = Concentration breakpoint ≥ C_p
BP_low = Concentration breakpoint ≤ C_p
C_p = Measured pollutant concentration
```

**PM2.5 Breakpoints (24-hr avg):**
| PM2.5 (µg/m³) | AQI Range | Category |
|---------------|-----------|----------|
| 0-30 | 0-50 | Good |
| 31-60 | 51-100 | Satisfactory |
| 61-90 | 101-200 | Moderate |
| 91-120 | 201-300 | Poor |
| 121-250 | 301-400 | Very Poor |
| 250+ | 401-500 | Severe |

### Prediction Algorithm

**Approach:** Time-series forecasting for 24-hour ahead predictions

**Input Features:**
- PM2.5 historical values (last 7 days minimum)
- Humidity levels
- Time of day (hourly patterns)
- Day of week (weekday vs weekend patterns)
- Optional: Temperature, wind speed (if available)

**Model Options (to be determined):**
1. **LSTM (Long Short-Term Memory):** Deep learning approach for sequential data
2. **ARIMA:** Statistical time-series model
3. **Prophet:** Facebook's forecasting tool (good for seasonal patterns)
4. **Ensemble:** Combination of multiple models for robustness

**Training Data Requirements:**
- Minimum: 1 month of historical data for basic model
- Optimal: 3-6 months for seasonal pattern recognition
- Update frequency: Daily retraining with new data

**Output:**
- Hourly AQI predictions for next 24 hours
- Confidence intervals (±20% target accuracy)
- Alerts when predictions exceed hazardous thresholds (AQI > 300)

### Sprinkler Control Logic (Algorithm To Be Developed)

**Decision Parameters:**
- **AQI Threshold:** Proposed activation at AQI > 200 (Poor category)
- **Humidity Check:** Avoid activation if humidity > 80% (ineffective, risk of waterlogging)
- **Prediction Factor:** Consider predicted trend (don't activate if AQI predicted to drop)
- **Time of Day:** Prefer early morning/evening activation (lower evaporation)

**Activation Duration Calculation:**
```
Base Duration (minutes) = f(Current AQI, Target AQI reduction %, Area coverage)

Adjustment Factors:
- Humidity level (reduce duration if high)
- Wind speed (increase if windy)
- Recent activation (avoid over-saturation)
```

**Water Volume Estimation:**
```
Volume (liters) = Spray rate (L/min) × Duration × Number of nozzles
Target: 15-30% AQI reduction per activation cycle
```

**Safety Mechanisms:**
- Manual override capability for emergencies
- Water pressure monitoring (shut off if pressure drops)
- Rainfall detection sensor (auto-disable during rain)
- Maximum daily water usage cap (prevent waste)
- Minimum interval between activations (30 minutes)
- Geofencing (only activate in designated zones)

---

## Google Antigravity Web Portal Features

### Dashboard (Primary View)
**Layout:**
- **Header:** "TEMP AQI - Real-time Air Quality Monitoring"
- **Map View:** Interactive colony map showing 4 sensor node locations
- **Real-time AQI Cards:** 
  - 4 cards (one per node) showing current AQI, PM2.5, humidity
  - Color-coded backgrounds matching AQI category
  - Last updated timestamp
- **Colony Average AQI:** Large display showing average of all 4 nodes
- **Trend Graphs:** Mini line charts showing last 24 hours for each node
- **Alert Banner:** Prominent warning if any node shows hazardous levels

### Prediction Module
**Components:**
- **24-hour Forecast Graph:** 
  - Line chart with time on X-axis, AQI on Y-axis
  - Color-coded zones (Good/Moderate/Poor/etc.)
  - Confidence interval shading
  - Current AQI marker for comparison
- **Hourly Breakdown Table:** Detailed predictions for each hour
- **Critical Alerts Section:** 
  - List of predicted hazardous periods
  - Recommended actions (e.g., "Sprinkler activation suggested at 6 AM")
- **Prediction Accuracy Tracker:** 
  - Compare yesterday's predictions vs actual values
  - Display accuracy percentage

### Sprinkler Control Panel
**Interface Elements:**
- **Status Dashboard:**
  - Large status indicator (Active/Inactive with color coding)
  - Current water pressure reading
  - Last activation details
- **Manual Controls:**
  - "Activate Now" button (emergency override)
  - Duration selector (5/10/15/30 minute presets)
  - Water volume estimator display
- **Automatic Mode Settings:**
  - Toggle for auto-activation
  - AQI threshold slider (default: 200)
  - Humidity limit setting
  - Schedule preferences (time windows)
- **Trigger History Log:**
  - Table showing last 20 activations
  - Columns: Date/Time, Duration, AQI Before, AQI After, Reduction %, Water Used
  - Export to CSV option
- **Water Usage Metrics:**
  - Daily total water consumption
  - Weekly average
  - Cost estimate (if water pricing available)

### Analytics & Reporting
- **Impact Assessment Dashboard:**
  - Before/after comparison charts
  - Average AQI reduction per intervention
  - Success rate (% of activations achieving target reduction)
- **Effectiveness Metrics:**
  - Monthly AQI trends
  - Intervention impact visualization
  - Cost per AQI point reduced
- **Data Export:**
  - Download raw sensor data (CSV format)
  - Generate PDF reports with charts
  - API access for integration with government systems
- **Historical Trends:**
  - Monthly/seasonal air quality patterns
  - Year-over-year comparisons (future phase)
  - Correlation analysis (AQI vs weather, traffic, festivals)

---

## Success Metrics

### Prototype Demo Success Criteria
✅ Stable real-time data transmission from ESP32 hardware node  
✅ Accurate AQI calculation matching CPCB formula  
✅ Functional 24-hour prediction visualization  
✅ Clear demonstration of sprinkler trigger logic  
✅ Professional, responsive web interface on Google Antigravity  
✅ Positive feedback from municipal authority audience  

### Pilot Deployment Success (Post-Prototype, 6 months)
- **Primary Goal:** Measurable 15-30% AQI reduction in intervention zones during activation periods
- **Data Collection:** 95%+ uptime for all 4 sensor nodes
- **Prediction Accuracy:** <20% error margin for 24-hour AQI forecasts
- **System Reliability:** <5% downtime for web portal and hardware
- **Water Efficiency:** Demonstrate cost-effectiveness (₹ per AQI point reduced)

### Long-term Impact (12 months)
- Deploy in 10+ colonies across Delhi
- Document consistent AQI improvement patterns
- Gain municipal approval for city-wide scaling
- Establish formal partnership with Delhi government/DPCC
- Publish research paper on intervention effectiveness

---

## Target Users & Stakeholders

### Primary Users
**Municipal Authorities & Government Officials**
- Real-time access to colony-level air quality data
- Decision support for pollution control interventions
- Evidence-based policy making capabilities
- Reporting tools for public communication

### Secondary Users
- **RWA Members:** System monitoring, maintenance coordination
- **Environmental Researchers:** Access to hyperlocal air quality data
- **Future Phase - Residents:** Public-facing dashboard for awareness

---

## Implementation Timeline

### Immediate (By Saturday, Feb 22, 2026)
- ✅ Build 1 functional ESP32 sensor node (PM2.5 + Humidity)
- ✅ Develop Google Antigravity web portal with all 3 core features:
  - Real-time dashboard
  - 24-hour prediction module
  - Sprinkler control interface
- ✅ Create simulation logic for 3 dummy nodes (realistic values)
- ✅ Test end-to-end data flow (ESP32 → Cloud → Antigravity portal)
- ✅ Prepare demo presentation and talking points

### Short-term (Weeks 1-4 post-demo)
- Incorporate feedback from Saturday's demo
- Finalize sensor node design (build 3 additional units)
- Identify specific pilot colony in Delhi
- Survey existing water infrastructure in target colony
- Obtain initial permissions from RWA/Municipal Corporation
- Develop detailed sprinkler activation algorithm

### Medium-term (Months 2-3)
- Deploy all 4 sensor nodes in pilot colony
- Install water mist system at 2 strategic locations
- Begin data collection phase (1 month baseline without intervention)
- Train prediction model with collected data
- Fine-tune Antigravity portal based on real data patterns

### Long-term (Months 4-6)
- Activate intervention system
- Collect impact data (AQI before/after each activation)
- Refine algorithms based on observed results
- Prepare comprehensive case study and impact report
- Present findings to Delhi government officials
- Secure funding for scaling to additional colonies

---

## Risk Assessment & Mitigation

### Technical Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Sensor accuracy degradation over time | High | Medium | Regular calibration schedule, purchase quality sensors, budget for replacements |
| WiFi connectivity issues in deployment area | Medium | Medium | 4G backup module, local data buffering on ESP32 SD card |
| Prediction model low accuracy initially | Medium | High | Start with simple models, continuous retraining, collect more data |
| Water system integration challenges | High | Medium | Early RWA engagement, pilot test with manual system first, hire plumber consultant |
| Google Antigravity platform limitations | Low | Low | Prototype on Antigravity but keep backend modular for platform migration if needed |

### Operational Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| RWA/Municipal approval delays | High | High | Start permission process early, demonstrate clear benefits, involve local corporator |
| Water wastage concerns from residents | High | Medium | Implement strict usage limits, show water consumption data, explain cost-benefit |
| Maintenance overhead too high | Medium | Medium | Design simple, robust hardware, train local RWA volunteers, remote monitoring |
| Vandalism or theft of sensors | Medium | Medium | Secure mounting at height, community awareness campaigns, insurance coverage |
| Lack of community buy-in | Medium | Low | Regular communication, public dashboard (future), show measurable results |

### Financial Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Costs exceed budget | Medium | Medium | Phased deployment, continuous cost monitoring, seek corporate sponsorships |
| Lack of government funding for scaling | High | Medium | Demonstrate strong ROI in pilot, explore CSR funding from corporations, crowd-funding |
| Water cost higher than estimated | Low | Low | Monitor usage closely, optimize activation algorithm for efficiency |

---

## Budget Estimate (Pilot Phase - 6 months)

### Hardware (4 nodes + sprinkler system)
- **4x Sensor Nodes:**
  - ESP32 modules (4x ₹500) = ₹2,000
  - PM2.5 sensors (4x ₹3,000) = ₹12,000
  - Humidity sensors (4x ₹800) = ₹3,200
  - Weather-proof enclosures (4x ₹2,000) = ₹8,000
  - Solar panels + batteries (4x ₹4,000) = ₹16,000
  - Mounting hardware = ₹5,000
  - **Subtotal:** ₹46,200

- **Water Mist System:**
  - High-pressure pumps (2x ₹25,000) = ₹50,000
  - Mist nozzles (20x ₹1,500) = ₹30,000
  - Solenoid valves and controllers (3x ₹8,000) = ₹24,000
  - Piping and fittings = ₹20,000
  - Installation labor = ₹25,000
  - Water pressure sensors = ₹6,000
  - **Subtotal:** ₹1,55,000

**Hardware Total:** ₹2,01,200

### Software & Cloud Infrastructure
- Google Antigravity platform hosting (6 months): ₹15,000
- Cloud database and storage (6 months): ₹10,000
- API services and compute (6 months): ₹8,000
- Domain and SSL certificates: ₹2,000
- **Subtotal:** ₹35,000

### Operations (6 months)
- Sensor calibration and maintenance: ₹15,000
- Water costs (estimated): ₹12,000
- Electricity for pumps: ₹8,000
- Field visits and monitoring: ₹15,000
- Contingency buffer (15%): ₹40,680
- **Subtotal:** ₹90,680

**TOTAL PILOT BUDGET:** ₹3,26,880 (~₹3.3 lakhs)

---

## Regulatory & Compliance

### Technical Standards
- **Sensor Accuracy:** Calibrated to match CPCB measurement standards
- **Data Reporting:** Compatible with Delhi Pollution Control Committee (DPCC) formats
- **Electrical Safety:** All equipment certified for outdoor use, proper grounding

### Environmental Compliance
- **Water Usage:** Comply with municipal water conservation regulations
- **Discharge:** Ensure no harmful runoff, check drainage adequacy
- **Impact Assessment:** Monitor for unintended consequences (waterlogging, mosquito breeding)

### Data & Privacy
- **Data Storage:** Secure cloud storage with encryption
- **Access Control:** Role-based permissions for municipal officials
- **Anonymization:** No personal data collection from residents
- **Transparency:** Public availability of aggregated air quality data

### Permissions Required
- RWA approval for sensor installation
- Municipal corporation approval for water system integration
- Electrical safety inspection clearance
- Environmental impact assessment (if required by authorities)

---

## Competitive Landscape

### Existing Solutions in India

1. **CPCB/DPCC Government Monitors**
   - Strengths: Official, established network
   - Weaknesses: Very sparse coverage (city-level only), no intervention, passive monitoring
   
2. **Private AQI Apps (AirVisual, etc.)**
   - Strengths: User-friendly, widespread
   - Weaknesses: Data aggregators only, no hyperlocal data, no intervention capability

3. **Smog Towers (Delhi experiment)**
   - Strengths: Large-scale air filtration
   - Weaknesses: Extremely expensive (₹20+ crores), limited proven effectiveness, high operating costs

4. **Indoor Air Purifiers**
   - Strengths: Effective indoors
   - Weaknesses: No outdoor impact, individual solution only

5. **Anti-Dust Cannons/Water Sprayers**
   - Strengths: Mechanical particulate suppression
   - Weaknesses: Manual operation, not data-driven, inefficient water use, limited coverage

### TEMP AQI Differentiators

✅ **Hyperlocal Coverage:** Colony-level granularity (0.5-1 sq km) vs city-wide averages  
✅ **Active Intervention:** Not just monitoring—actively reducing pollution in real-time  
✅ **Predictive Intelligence:** 24-hour forecasts enable proactive measures  
✅ **Cost-Effective:** Leverages existing water infrastructure, low-cost sensors  
✅ **Scalable Architecture:** Modular design allows rapid colony-by-colony deployment  
✅ **Data-Driven:** Algorithm-controlled activation based on multiple parameters  
✅ **Integration-Ready:** API for connection with government air quality networks  
✅ **Open Platform:** Built on accessible Google Antigravity, potential for open-source contributions  

---

## Open Questions & Future Development Needs

### Critical Algorithm Development (Next 2 weeks)

**1. Sprinkler Activation Logic - Priority Items:**
- Optimal AQI threshold for activation (proposed: >200, but needs validation)
- Water volume calculation methodology
  - Formula: f(Current AQI, Area, Humidity, Wind, Nozzle specs)
- Spray duration vs AQI reduction correlation
  - Need research: How much AQI reduction per minute of spray?
- Multi-factor decision matrix incorporating:
  - Current AQI
  - Predicted AQI trend
  - Humidity level
  - Wind speed (if sensor added)
  - Temperature
  - Time of day
  - Recent activation history

**2. Prediction Model Development:**
- Feature selection and engineering
- Model comparison testing (LSTM vs ARIMA vs Prophet)
- Hyperparameter tuning
- Retraining frequency determination
- Accuracy improvement strategies
- Integration with weather forecast APIs?

### System Enhancements (Future Phases)

**Hardware:**
- Add wind speed sensor for better sprinkler optimization
- Add PM10 sensor for comprehensive AQI calculation
- Solar-powered autonomous sensor nodes
- Battery backup for 48-hour operation
- GSM/4G module for areas with poor WiFi

**Software:**
- Mobile app for residents (Android/iOS)
- SMS/WhatsApp alert system for hazardous AQI
- Public dashboard version (simplified view for residents)
- Integration with Delhi government's Sameer app
- API for third-party app developers
- Machine learning for optimal sprinkler placement recommendations
- Automated reporting system (daily/weekly email summaries)

**Data & Analytics:**
- Multi-pollutant monitoring (NO2, SO2, CO, O3)
- Correlation analysis with traffic patterns
- Source apportionment (identify pollution sources)
- Health impact assessment (AQI vs hospital visits)
- Integration with satellite data for larger context

**Community Features:**
- Citizen science participation (crowdsourced observations)
- Air quality awareness campaigns
- School education programs
- Gamification for community engagement
- Social media integration for alerts

---

## Technical Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        USER LAYER                            │
│  Municipal Officials │ RWA Members │ Researchers │ Public    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              GOOGLE ANTIGRAVITY WEB PORTAL                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │  Prediction  │  │   Sprinkler  │      │
│  │   (Real-time)│  │   (24-hour)  │  │    Control   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   CLOUD BACKEND                              │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────┐         │
│  │ Real-time  │  │  Prediction  │  │ Sprinkler   │         │
│  │  Database  │  │     Model    │  │  Controller │         │
│  │  (Firebase)│  │   (ML/AI)    │  │   Logic     │         │
│  └────────────┘  └──────────────┘  └─────────────┘         │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────┐         │
│  │ AQI Calc   │  │ Historical   │  │   Alert     │         │
│  │  Engine    │  │  Data Store  │  │  Generator  │         │
│  └────────────┘  └──────────────┘  └─────────────┘         │
└────────────┬────────────────────────────┬───────────────────┘
             │                            │
             ▼                            ▼
┌────────────────────────┐    ┌──────────────────────┐
│   SENSOR NETWORK       │    │  INTERVENTION SYSTEM │
│  ┌──────┐  ┌──────┐   │    │  ┌────────────────┐  │
│  │Node 1│  │Node 2│   │    │  │ Water Mist     │  │
│  │ESP32 │  │ESP32 │   │    │  │ Sprinklers     │  │
│  │PM2.5 │  │PM2.5 │   │    │  │ (2-3 locations)│  │
│  │Humid │  │Humid │   │    │  └────────────────┘  │
│  └──────┘  └──────┘   │    │  ┌────────────────┐  │
│  ┌──────┐  ┌──────┐   │    │  │ Pumps &        │  │
│  │Node 3│  │Node 4│   │    │  │ Controllers    │  │
│  │ESP32 │  │ESP32 │   │    │  └────────────────┘  │
│  │PM2.5 │  │PM2.5 │   │    └──────────────────────┘
│  │Humid │  │Humid │   │            │
│  └──────┘  └──────┘   │            │
└────────────────────────┘            │
             │                        │
             ▼                        ▼
┌─────────────────────────────────────────┐
│     COLONY (0.5-1 sq km coverage)       │
│  Target: Demonstrable AQI Reduction     │
└─────────────────────────────────────────┘
```

---

## Conclusion

TEMP AQI represents a paradigm shift from passive air quality monitoring to **active, data-driven intervention** in Delhi's fight against air pollution. Built on Google's Antigravity platform, the system combines cutting-edge IoT sensor technology with predictive analytics and real-time automated response.

**The Saturday prototype demonstration** will showcase the technical feasibility and user experience of this innovative system. With one real sensor node feeding live data and three simulated nodes demonstrating full-scale capability, municipal authorities will see the potential of hyperlocal air quality management.

**Post-prototype, the pilot deployment** in a single Delhi colony will provide concrete evidence of TEMP AQI's effectiveness. The primary goal—**measurable 15-30% AQI reduction during intervention periods**—is achievable through optimized water-mist activation driven by real-time data and predictive intelligence.

Success in the pilot phase will pave the way for city-wide adoption, offering Delhi's municipal authorities a powerful, scalable, cost-effective tool to combat the air pollution crisis that affects millions of residents daily.

---

## Appendices

### Appendix A: CPCB AQI Calculation - Detailed Formula

**Standard Breakpoint Table (PM2.5, 24-hour average):**

| C_low | C_high | I_low | I_high | Category |
|-------|--------|-------|--------|----------|
| 0 | 30 | 0 | 50 | Good |
| 31 | 60 | 51 | 100 | Satisfactory |
| 61 | 90 | 101 | 200 | Moderate |
| 91 | 120 | 201 | 300 | Poor |
| 121 | 250 | 301 | 400 | Very Poor |
| 250+ | 380 | 401 | 500 | Severe |

**Calculation Steps:**
1. Identify which breakpoint range contains measured PM2.5 value
2. Apply linear interpolation formula
3. Round to nearest integer
4. Assign category and color

### Appendix B: ESP32 Hardware Specifications

**Microcontroller:** ESP32-DevKitC  
**Processor:** Dual-core Xtensa LX6, 240 MHz  
**Memory:** 520 KB SRAM, 4 MB Flash  
**Connectivity:** WiFi 802.11 b/g/n, Bluetooth 4.2  
**GPIO Pins:** 34 programmable  
**Power:** 3.3V, 500mA typical  
**Operating Temp:** -40°C to +85°C  

**PM2.5 Sensor (PMS5003):**
- Measurement range: 0-500 µg/m³
- Particle size: 0.3-10 µm
- Response time: <10 seconds
- Interface: UART serial
- Operating voltage: 5V

**Humidity Sensor (DHT22):**
- Humidity range: 0-100% RH
- Accuracy: ±2% RH
- Temperature range: -40°C to +80°C
- Interface: Single-wire digital

### Appendix C: Water Mist Technology - Research Summary

**Mechanism of PM2.5 Reduction:**
1. Fine water droplets (10-50 microns) sprayed into air
2. Droplets collide with PM2.5 particles (2.5 microns)
3. Particles bind to water droplets
4. Combined mass increases, gravity pulls down
5. Particles settle on ground, removed from breathing zone

**Expected Effectiveness:**
- Research from China/Korea shows 15-40% PM2.5 reduction
- Effectiveness varies by humidity, wind, particle composition
- Optimal conditions: Low humidity (<60%), low wind (<5 km/h)
- Duration: Effects last 30-90 minutes per activation

**Water Requirements:**
- Estimated 200-500 liters per activation cycle
- Coverage: ~0.1-0.2 sq km per sprinkler location
- Cost: ~₹10-25 per activation (Delhi water rates)

### Appendix D: Demo Checklist for Saturday

**Hardware Prep:**
- [ ] ESP32 node fully assembled and tested
- [ ] PM2.5 sensor calibrated
- [ ] Humidity sensor functional
- [ ] Power supply stable (battery backup ready)
- [ ] WiFi connection tested
- [ ] Data transmission verified

**Software Prep:**
- [ ] Google Antigravity portal deployed and accessible
- [ ] Real-time dashboard displays Node 1 live data
- [ ] Dummy data generator running for Nodes 2, 3, 4
- [ ] AQI calculation accuracy verified
- [ ] 24-hour prediction graph populated with sample data
- [ ] Sprinkler control interface functional
- [ ] All interactive elements working smoothly

**Presentation Prep:**
- [ ] Demo script prepared
- [ ] Talking points for each feature
- [ ] Backup plan if live sensor fails (full simulation mode)
- [ ] Questions & answers anticipated
- [ ] Budget and timeline slides ready
- [ ] Contact information for follow-up

**Testing:**
- [ ] End-to-end test run (sensor → cloud → portal)
- [ ] Load test for multiple simultaneous users
- [ ] Cross-browser compatibility check
- [ ] Mobile responsiveness verified
- [ ] Screenshot/video recording of working demo

---

**Document Control**
- **Created:** February 16, 2026
- **Platform:** Google Antigravity
- **Last Updated:** February 16, 2026
- **Next Review:** Post-prototype demo (February 23, 2026)
- **Approval Status:** Draft for Demo Presentation

---

**For questions, feedback, or collaboration:**  
Contact: [Your Contact Information]  

Demo Date: Saturday, February 22, 2026  
Target Audience: Municipal Authorities & Government Officials

---

*TEMP AQI - Transforming Delhi's Air Quality Through Data-Driven Intervention*
