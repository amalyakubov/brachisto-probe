# Probes and Skills Guide

This document describes probe characteristics, base skills, and how research affects probe capabilities.

## Probe Type

Currently, the game uses a **single universal probe type** that can perform all activities.

### Base Probe Characteristics

| Property | Value | Description |
|----------|-------|-------------|
| **Mass** | 100 kg | Metal cost to build one probe |
| **Base Mining Rate** | 100 kg/day | Mass extraction rate per probe |
| **Base Build Rate** | 100 kg/day | Construction rate per probe |
| **Movement Speed** | 30 km/s | Base transfer velocity |
| **Energy Consumption** | 100 kW | Power draw when actively working (idle probes consume no energy) |
| **Base Dexterity** | 1.0 | Physical capability multiplier |

### Probe Capabilities

Probes can perform three main activities:

1. **Harvest (Mining)**
   - Extracts metal and slag from orbital zones
   - Rate: 100 kg/day per probe (base)
   - Affected by: Mining efficiency research, zone multipliers

2. **Construct**
   - Builds structures or replicates probes
   - Rate: 100 kg/day per probe (base)
   - Can build 1 probe (~100 kg) in ~1 day with 10 probes allocated
   - Affected by: Building efficiency research, robotic systems

3. **Dyson Construction**
   - Converts metal to Dyson sphere mass
   - Efficiency: 50% (2 kg metal → 1 kg Dyson mass)
   - Affected by: Dyson construction research

## Skill System

Skills represent probe capabilities that are enhanced by research. Each skill has a **base value** and a **research bonus** that multiplies effectiveness.

### Skill Calculation

```
Effective Skill Value = Base Value × (1 + Research Bonus)
```

Where:
- **Base Value**: Starting value before any research
- **Research Bonus**: Multiplicative bonus from completed research (e.g., 0.5 = +50%)

### Base Skill Values

| Skill Category | Base Value | Description |
|----------------|------------|-------------|
| **Propulsion Systems** | 500 seconds (ISP) | Specific impulse for rocket engines |
| **Locomotion Systems** | 1.0 | Movement efficiency multiplier |
| **ACDS** | 1.0 | Autonomous control efficiency |
| **Robotic Systems** | 1.0 | Dexterity multiplier |
| **Production Efficiency** | 1.0 | Mining/building rate multiplier |
| **Recycling Efficiency** | 0.75 (75%) | Slag-to-metal conversion rate |
| **Energy Collection** | 1.0 | Solar energy capture multiplier |
| **Solar Concentrators** | 1.0 | Solar concentration multiplier |
| **Energy Storage** | 1.0 | Storage capacity multiplier |
| **Energy Transport** | 1.0 | Energy transfer efficiency |
| **Energy-Matter Conversion** | 0.0 | Conversion rate (starts disabled) |
| **Dyson Swarm Construction** | 1.0 | Dyson construction rate multiplier |
| **Computer Systems** | 1.0 | Compute power (geometric mean of sub-skills) |

### Computer Systems Sub-Skills

Computer Systems uses a **geometric mean** of four sub-skills:

```
Compute Power = (Processing × Memory × Interface × Transmission)^0.25
```

Each sub-skill has base value 1.0 and is enhanced independently by research.

## Research Trees and Their Effects

### Propulsion Systems

**Purpose**: Reduces energy costs for orbital operations and improves specific impulse.

**Research Tiers**:
1. Hydrazine Rockets (+20% total bonus)
2. Hydrogen Rockets (+25%)
3. Methalox Rockets (+30%)
4. Vacuum-Rated Nozzles (+35%)
5. Thermal Fission Drive (+40%)
6. FRC Fusion Drive (+45%)
7. Antimatter Catalyzed (+50%)
8. Antimatter Beam Core (+55%)
9. MHD Inertial Mass Reduction (+60%)

**Effects on Probes**:
- **Orbital Transfer Energy Reduction**: Reduces energy cost for moving between zones
- **Dexterity Energy Cost Reduction**: Reduces energy cost for mining/building operations
- **Build Energy Cost Reduction**: Reduces energy cost specifically for construction
- **Specific Impulse Improvement**: Increases rocket efficiency (affects transfer times)

**Example**: With +50% research bonus:
- Base ISP: 500 seconds
- Effective ISP: 500 × 1.5 = 750 seconds
- Energy costs reduced by ~33%

### Locomotion Systems

**Purpose**: Improves movement efficiency, reduces transfer times, and increases carrying capacity.

**Research Tiers**:
1. Cold Gas Thrusters
2. Reaction Wheels
3. Ion Drives
4. Hall Effect Thrusters
5. VASIMR
6. Magnetic Sails
7. Unruh Horizon Higgs

**Effects on Probes**:
- **Movement Efficiency**: Reduces energy costs for all movement
- **Transfer Speed**: Increases velocity for orbital transfers
- **Carrying Capacity**: Allows probes to transport more material
- **Energy Cost Reduction**: Multiplies with propulsion systems

**Example**: With +40% research bonus:
- Base movement efficiency: 1.0
- Effective efficiency: 1.4
- Transfer times reduced by ~29%

### Robotic Systems

**Purpose**: Directly multiplies probe dexterity (mining and building rates).

**Research Tiers**:
1. Manipulator Arms
2. Multi-DOF Arms
3. Tendon-Driven Systems
4. Soft Robotics
5. Swarm Coordination
6. Zero-Point Disruptors

**Effects on Probes**:
- **Dexterity Multiplier**: Directly multiplies mining and building rates
- **Coordination**: Improves multi-probe operations

**Example**: With +60% research bonus:
- Base mining rate: 100 kg/day
- Effective rate: 100 × 1.6 = 160 kg/day per probe
- 10 probes mine 1,600 kg/day instead of 1,000 kg/day

### Production Efficiency

**Purpose**: Improves resource extraction, processing, and energy efficiency.

**Research Tiers**:
1. Basic Automation
2. Advanced Automation
3. Precision Mining
4. Molecular Sorting
5. Quantum Extraction
6. ... (10 tiers total)

**Effects on Probes**:
- **Mining Rate Multiplier**: Increases metal extraction rate
- **Harvest Efficiency Multiplier**: Improves overall mining efficiency
- **Energy Efficiency Bonus**: Reduces energy consumption for operations
- **Building Rate Multiplier**: Increases construction speed

**Example**: With +80% research bonus:
- Base mining rate: 100 kg/day
- Effective rate: 100 × 1.8 = 180 kg/day per probe
- Energy consumption reduced by ~44%

### Energy Collection

**Purpose**: Improves solar energy capture from structures (doesn't directly affect probes).

**Research Tiers**:
1. Basic Solar Collection
2. Concentrated Solar
3. Thermal Storage
4. Quantum Photovoltaics
5. ... (10 tiers total)

**Effects**:
- **Solar Efficiency Multiplier**: Increases energy production from solar structures
- **Energy Collection Multiplier**: General energy capture improvement

**Note**: This affects structures, not probe energy consumption.

### Computer Systems

**Purpose**: Generates intelligence (FLOPS) for research.

**Subcategories**:

#### Processing
- CPU performance and computational speed
- Base: 1.0
- Research improves processing power

#### Memory
- Data storage and retrieval capacity
- Base: 1.0
- Research improves memory bandwidth

#### Interface
- Input/output bandwidth
- Base: 1.0
- Research improves data transfer rates

#### Transmission
- Network and communication speed
- Base: 1.0
- Research improves transmission rates

**Total Compute Power**:
```
Compute = (Processing × Memory × Interface × Transmission)^0.25
```

**Example**: With all sub-skills at +50%:
- Processing: 1.5
- Memory: 1.5
- Interface: 1.5
- Transmission: 1.5
- Total Compute: (1.5^4)^0.25 = 1.5 = +50% total

### Dyson Swarm Construction

**Purpose**: Optimizes Dyson sphere construction rate and efficiency.

**Research Tiers**:
1. Multi-Body Agent Coordination (+25%)
2. Large-Scale Deployment (+30%)
3. Modular Articulated Structures (+35%)
4. Kessler-Enhanced Chaotic Control (+40%)
5. Perturbative Swarm Solutions (+45%)
6. ... (9 tiers total)

**Effects on Probes**:
- **Dyson Construction Rate Multiplier**: Increases construction speed
- **Swarm Coordination**: Improves multi-probe coordination
- **Orbital Optimization**: Better positioning and efficiency

**Example**: With +100% research bonus:
- Base construction rate: 100 kg/day per probe
- Effective rate: 100 × 2.0 = 200 kg/day per probe
- Dyson sphere builds twice as fast

### ACDS (Autonomous Control & Decision Systems)

**Purpose**: Improves probe autonomy and decision-making.

**Research Tiers**:
1. Gravity Boom
2. Invariant Manifold
3. ... (8 tiers total)

**Effects on Probes**:
- **Autonomy Multiplier**: Improves independent operation
- **Decision Efficiency**: Better resource allocation
- **Coordination**: Enhanced swarm behavior

## Research Compounding System

### How Research Works

Research uses an **exponential compounding system**:

1. **During Research**:
   ```
   Bonus = Base Bonus × e^(0.20 × time_in_days)
   ```
   - Compounds continuously at 20% per day
   - Each tranche completed increases the base bonus

2. **On Tier Completion**:
   ```
   Bonus = (Base Bonus × 2) × e^(0.20 × time_since_completion)
   ```
   - Principal doubles when tier completes
   - Continues compounding from completion time

3. **Tier Multiplication**:
   ```
   Total Bonus = Tier1_Bonus × Tier2_Bonus × Tier3_Bonus × ...
   ```
   - Each tier compounds independently
   - Tiers multiply together for total effect

### Example Calculation

**Propulsion Systems - Tier 1 (Hydrazine Rockets)**:
- Base bonus per tranche: 2%
- Total tranches: 10
- Maximum tier bonus: 20%

**After 10 days of research**:
- If 5 tranches completed: Bonus = 0.10 × e^(0.20 × 10) = 0.10 × 7.39 = 0.739 (+73.9%)

**After tier completion**:
- Principal doubles: 0.20 × 2 = 0.40
- After 10 more days: Bonus = 0.40 × e^(0.20 × 10) = 0.40 × 7.39 = 2.956 (+295.6%)

**Multiple tiers**:
- Tier 1 bonus: 2.956
- Tier 2 bonus: 3.5 (example)
- Total: 2.956 × 3.5 = 10.346 (+1034.6% effective bonus)

## Skill Interaction Examples

### Mining Efficiency

**Base**: 100 kg/day per probe

**With Research**:
- Robotic Systems: +60% → 160 kg/day
- Production Efficiency: +80% → 288 kg/day
- Zone multiplier (Mercury): ×1.5 → 432 kg/day

**10 probes**: 4,320 kg/day total

### Building Efficiency

**Base**: 100 kg/day per probe

**With Research**:
- Robotic Systems: +60% → 160 kg/day
- Production Efficiency: +80% → 288 kg/day

**Building 1 probe (100 kg)**:
- 1 probe: 288 days
- 10 probes: 28.8 days
- 100 probes: 2.88 days

### Energy Consumption

**Base**: 100 kW per probe when working

**With Research**:
- Propulsion Systems: -33% energy cost → 67 kW
- Production Efficiency: -44% energy cost → 37.5 kW

**10 probes mining**: 375 kW total (vs 1,000 kW base)

## Optimal Research Paths

### Early Game (First Research)

1. **Production Efficiency** (Tier 1)
   - Immediate benefit: +20% mining/building rates
   - Low cost, high impact

2. **Propulsion Systems** (Tier 1)
   - Reduces energy costs
   - Enables more efficient operations

### Mid Game

1. **Robotic Systems** (Tier 1-3)
   - Direct dexterity multiplier
   - Scales with probe count

2. **Energy Collection** (Tier 1-2)
   - Supports energy-intensive operations
   - Enables structure expansion

### Late Game

1. **Dyson Swarm Construction** (All tiers)
   - Critical for Dyson sphere completion
   - Reduces target mass

2. **Computer Systems** (All subcategories)
   - Maximizes research speed
   - Enables rapid tech advancement

## Summary

- **Probes** are universal units with base rates of 100 kg/day for mining and building
- **Skills** multiply probe effectiveness through research bonuses
- **Research** compounds exponentially, doubling on tier completion
- **Multiple skills** multiply together for massive improvements
- **Optimal strategy**: Focus on Production Efficiency and Robotic Systems early, then specialize based on bottlenecks

