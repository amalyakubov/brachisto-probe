# Brachisto-Probe

A minimum-time simulation game for constructing Dyson spheres. Build probes, research technologies, construct structures, and expand across the solar system to harness stellar energy.

## Table of Contents

- [Game Overview](#game-overview)
- [Getting Started](#getting-started)
- [Core Gameplay Mechanics](#core-gameplay-mechanics)
- [Resources](#resources)
- [Probes](#probes)
- [Structures](#structures)
- [Research System](#research-system)
- [Orbital Zones](#orbital-zones)
- [Dyson Sphere Construction](#dyson-sphere-construction)
- [Strategy Guide](#strategy-guide)

## Game Overview

Brachisto-Probe is an incremental/idle game where you manage autonomous probes to build a Dyson sphere around the Sun. The game features:

- **Time-based progression**: All rates are measured in "per day" units
- **Exponential research system**: Research compounds continuously with exponential growth
- **Orbital mechanics**: Different zones have varying costs, productivity, and resource availability
- **Energy management**: Store excess energy in watt-days for later use
- **Modular construction**: Build factories, mining stations, energy collectors, and more

## Getting Started

### Starting Conditions

- **1 Probe** at Earth orbit
- **1,000 kg** of metal
- **100 kW** constant energy supply
- **No structures** initially

### Basic Controls

- **Time Controls**: Speed up or slow down game time (1x to 100x speed)
- **Probe Allocation**: Allocate probes to mining, construction, or Dyson sphere building
- **Zone Selection**: Choose which orbital zone to operate in
- **Research Panel**: Enable and prioritize research projects
- **Building Panel**: Construct structures to boost production

## Core Gameplay Mechanics

### Time System

The game uses **days** as the fundamental time unit:
- Each tick advances time by 1/60 day (at 1x speed)
- All rates are measured in "per day" (kg/day, probes/day, etc.)
- Energy is measured in watts (W), but storage is in watt-days (W·d)

### Probe Activities

Probes can be allocated to three main activities:

1. **Harvest (Mining)**: Extract metal from orbital zones
   - Base rate: 100 kg/day per probe
   - Affected by: mining efficiency research, zone multipliers
   - Produces slag as a byproduct (can be recycled)

2. **Construct**: Build structures or replicate probes
   - Base rate: 100 kg/day per probe (can build 1 probe in ~1 day with 10 probes)
   - Structures cost metal and take time based on construction rate
   - Can be split between structure building and probe replication

3. **Dyson Construction**: Build the Dyson sphere
   - Converts metal to Dyson sphere mass
   - 50% efficiency (2 kg metal → 1 kg Dyson mass)
   - Target: 5×10²⁴ kg (can be reduced by research)

### Resource Management

#### Metal
- **Production**: Mining from orbital zones
- **Consumption**: Building probes, structures, Dyson sphere
- **Storage**: Unlimited (no cap)

#### Energy
- **Production**: Solar arrays, Dyson sphere power allocation
- **Consumption**: Probe activities, structure operation
- **Storage**: Limited by storage facilities (measured in watt-days)
- **Base Supply**: 100 kW constant supply

#### Intelligence (FLOPS)
- **Production**: Compute structures, Dyson sphere compute allocation
- **Consumption**: Research projects
- **Purpose**: Drives research progress

#### Dexterity
- **Definition**: Total probe capability for physical work
- **Calculation**: Sum of all probes × base dexterity × research multipliers
- **Usage**: Determines mining, building, and Dyson construction capacity

## Probes

Currently, the game uses a **single probe type** with the following characteristics:

### Base Probe Stats

- **Mass**: 100 kg
- **Mining Rate**: 100 kg/day
- **Build Rate**: 100 kg/day
- **Movement Speed**: 30 km/s
- **Energy Consumption**: 100 kW (only when actively working)

### Probe Replication

- **Manual Replication**: Allocate probes to "Construct" → "Replicate"
- **Time**: ~1 day per probe with 10 probes allocated (scales linearly)
- **Cost**: 100 kg metal per probe
- **Factory Production**: Factories can produce probes automatically (more efficient)

### Research Effects on Probes

Research improves probe capabilities through skill multipliers:

- **Propulsion Systems**: Reduces energy costs for orbital transfers and operations
- **Locomotion Systems**: Improves movement efficiency and reduces transfer times
- **Robotic Systems**: Increases dexterity (mining/building efficiency)
- **Production Efficiency**: Multiplies mining and building rates
- **ACDS (Autonomous Control & Decision Systems)**: Improves probe autonomy and coordination

See [PROBES_AND_SKILLS.md](PROBES_AND_SKILLS.md) for detailed information.

## Structures

Structures are organized into 5 categories, each with 5 tiers:

### Energy Structures

Generate power from solar energy. More efficient closer to the Sun.

**Tier 1**: Basic Solar Array (10 MW, 10,000 kg)
**Tier 2**: Solar Mass Reactor (1 GW, 1,000,000 kg)
**Tier 3**: Orbital Power Station (100 GW, 100,000,000 kg)
**Tier 4**: Stellar Harvester (10 TW, 10,000,000,000 kg)
**Tier 5**: Dyson Energy Core (1 PW, 1,000,000,000,000 kg)

**Storage Structures**:
- **Basic Energy Storage**: 10 MW·d capacity, 10,000 kg cost

### Mining Structures

Automated mining facilities that produce metal continuously.

**Tier 1**: Basic Mining Station (10,000 kg/day, 10,000 kg)
**Tier 2**: Industrial Mining Complex (1,000,000 kg/day, 1,000,000 kg)
**Tier 3**: Planetary Excavator (100,000,000 kg/day, 100,000,000 kg)
**Tier 4**: Asteroid Processor (10,000,000,000 kg/day, 10,000,000,000 kg)
**Tier 5**: Molecular Dissembler (1,000,000,000,000 kg/day, 1,000,000,000,000 kg)

### Factories

Automated probe production facilities. More efficient than manual replication.

**Tier 1**: Mobile Factory (800 probes/day, 7 kg/probe, 10,000 kg)
**Tier 2**: Probe Factory (80,000 probes/day, 4.9 kg/probe, 1,000,000 kg)
**Tier 3**: Orbital Shipyard (8,000,000 probes/day, 3.43 kg/probe, 100,000,000 kg)
**Tier 4**: Mega Shipyard (800,000,000 probes/day, 2.401 kg/probe, 10,000,000,000 kg)
**Tier 5**: System Fabrication Network (80,000,000,000 probes/day, 1.68 kg/probe, 1,000,000,000,000 kg)

### Compute Structures

Generate intelligence (FLOPS) for research.

**Tier 1**: Orbital Data Center (1 PFLOPS, 10,000 kg)
**Tier 2**: Quantum Compute Hub (100 PFLOPS, 1,000,000 kg)
**Tier 3**: Research Complex (10,000 PFLOPS, 100,000,000 kg)
**Tier 4**: Stellar Compute Network (1,000,000 PFLOPS, 10,000,000,000 kg)
**Tier 5**: Dyson Compute Core (100,000,000 PFLOPS, 1,000,000,000,000 kg)

### Transport Structures

Improve transfer speeds between orbital zones.

**Tier 1**: Transport Hub (2× speed, 10,000 kg)
**Tier 2**: Quantum Relay (5× speed, 1,000,000 kg)
**Tier 3**: Wormhole Gate (10× speed, bypasses limits, 100,000,000 kg)

### Building Costs

- **Tier 1**: 10,000 kg
- **Tier 2**: 1,000,000 kg (100× Tier 1)
- **Tier 3**: 100,000,000 kg (100× Tier 2)
- **Tier 4**: 10,000,000,000 kg (100× Tier 3)
- **Tier 5**: 1,000,000,000,000 kg (100× Tier 4)

## Research System

### Research Mechanics

Research uses an **exponential compounding system**:

1. **During Research**: Bonus compounds continuously: `bonus = base_bonus × e^(0.20 × time_in_days)`
2. **On Completion**: Principal doubles, then continues compounding: `bonus = (base_bonus × 2) × e^(0.20 × time_since_completion)`
3. **Tier Compounding**: Each tier compounds independently, then tiers multiply together

### Research Trees

#### Propulsion Systems
Improves energy efficiency for orbital operations.

**Tiers**: Hydrazine Rockets → Hydrogen Rockets → Methalox Rockets → Vacuum-Rated Nozzles → Thermal Fission Drive → FRC Fusion Drive → Antimatter Catalyzed → Antimatter Beam Core → MHD Inertial Mass Reduction

**Effects**: Reduces energy costs for transfers, mining, and building operations

#### Locomotion Systems
Improves movement and transport efficiency.

**Tiers**: Cold Gas Thrusters → Reaction Wheels → Ion Drives → Hall Effect Thrusters → VASIMR → Magnetic Sails → Unruh Horizon Higgs

**Effects**: Reduces energy costs, increases carrying capacity, improves transfer speeds

#### Robotic Systems
Improves probe dexterity and physical capabilities.

**Tiers**: Manipulator Arms → Multi-DOF Arms → Tendon-Driven → Soft Robotics → Swarm Coordination → Zero-Point Disruptors

**Effects**: Multiplies mining and building rates

#### Production Efficiency
Improves resource extraction and processing.

**Tiers**: Basic Automation → Advanced Automation → Precision Mining → Molecular Sorting → Quantum Extraction → ...

**Effects**: Multiplies mining rates, reduces energy consumption, improves recycling

#### Energy Collection
Improves solar energy capture efficiency.

**Tiers**: Basic Solar → Concentrated Solar → Thermal Storage → Quantum Photovoltaics → ...

**Effects**: Multiplies energy production from solar structures

#### Computer Systems
Generates intelligence (FLOPS) for research.

**Subcategories**:
- **Processing**: CPU performance
- **Memory**: Data storage capacity
- **Interface**: I/O bandwidth
- **Transmission**: Network speed

**Effect**: Geometric mean of all subcategories determines total compute power

#### Dyson Swarm Construction
Optimizes Dyson sphere construction.

**Tiers**: Multi-Body Agent Coordination → Large-Scale Deployment → Modular Articulated Structures → Kessler-Enhanced Chaotic Control → Perturbative Swarm Solutions → ...

**Effects**: Increases Dyson construction rate, reduces target mass

### Research Costs

Research costs scale exponentially:
- **First Tier**: ~10 PFLOPS total cost
- **Each Tier**: 2× more expensive than previous
- **Tranches**: Each tier has 10 tranches (progress milestones)

## Orbital Zones

### Zone Properties

Each zone has:
- **Delta-V Penalty**: Energy cost multiplier for operations
- **Energy Cost Multiplier**: Base energy cost modifier
- **Productivity Modifier**: General efficiency bonus
- **Mining Rate Multiplier**: Mining efficiency bonus
- **Metal Percentage**: Fraction of mined material that's metal (rest is slag)

### Available Zones

1. **Dyson Sphere** (0.2 AU)
   - Special zone for Dyson construction only
   - No mining allowed
   - Highest productivity (2.0×)

2. **Mercury** (0.39 AU)
   - Closest to Sun
   - Highest solar energy density
   - High metal percentage (68%)
   - High mining multiplier (1.5×)

3. **Venus** (0.72 AU)
   - Inner solar system
   - Good energy availability
   - Moderate metal percentage (30%)

4. **Earth** (1.0 AU)
   - Baseline zone (1.0× multipliers)
   - Starting location
   - Moderate metal percentage (32%)

5. **Mars** (1.52 AU)
   - Outer inner system
   - Lower energy density
   - Moderate metal percentage (25%)

6. **Asteroid Belt** (2.5-3.5 AU)
   - Rich in resources
   - High mining multiplier (varies)
   - Lower energy density

7. **Jupiter** (5.2 AU)
   - Gas giant (limited mining)
   - Very low energy density

8. **Kuiper Belt** (30-50 AU)
   - Extreme distances
   - Very low energy density
   - Long transfer times

### Transfer Mechanics

- **Base Transfer Time**: 90 days (Mercury ↔ Dyson Sphere)
- **Scaling**: Based on distance ratio and delta-V requirements
- **Speed**: Affected by transport structures and propulsion research

## Dyson Sphere Construction

### Goal

Build a Dyson sphere with **5×10²⁴ kg** of mass (can be reduced by research).

### Construction Process

1. **Allocate Probes**: Set probes to "Dyson Construction" activity
2. **Metal Conversion**: 2 kg metal → 1 kg Dyson mass (50% efficiency)
3. **Energy Production**: Once built, produces 5 kW per kg of mass
4. **Power Allocation**: Split Dyson power between:
   - **Economy (Energy)**: Powers operations
   - **Compute (Intelligence)**: Drives research

### Research Benefits

- **Dyson Swarm Construction**: Increases construction rate
- **Advanced tiers**: Can reduce target mass by up to 50%

## Strategy Guide

### Early Game (First 100 Days)

1. **Build Probes**: Start with 1 probe, build to ~10 probes
2. **Mine Metal**: Focus on Earth or Mercury for metal
3. **Research**: Start with Propulsion Systems or Production Efficiency
4. **First Structures**: Build Basic Solar Array for energy, then Basic Mining Station

### Mid Game (100-1000 Days)

1. **Specialize**: Build factories for automated probe production
2. **Expand**: Move operations to Mercury for better energy/mining
3. **Research**: Focus on Production Efficiency and Energy Collection
4. **Infrastructure**: Build multiple mining stations and energy arrays

### Late Game (1000+ Days)

1. **Scale Up**: Build higher-tier structures (Tier 3-4)
2. **Dyson Construction**: Begin allocating probes to Dyson sphere
3. **Research**: Complete all research trees for maximum multipliers
4. **Optimization**: Balance energy/compute allocation from Dyson sphere

### Tips

- **Energy Storage**: Build storage facilities early to buffer energy production
- **Zone Selection**: Mercury is best for energy-intensive operations
- **Factory Efficiency**: Factories are 30% more efficient than manual replication
- **Research Priority**: Production Efficiency → Energy Collection → Dyson Construction
- **Recycling**: Recycle slag to recover metal (75% base efficiency, improves with research)

## Technical Details

### Time System

- **Fundamental Unit**: 1 day
- **Tick Rate**: 60 ticks per second (real time)
- **Time Speed**: 1x = 1 day per real second
- **Maximum Speed**: 100x (100 days per real second)

### Energy System

- **Units**: Watts (W) for rates, Watt-days (W·d) for storage
- **Storage**: 1 W·d = 1 watt for 1 day
- **Conversion**: Net energy (watts) × time (days) = watt-days

### Research Compounding

The research system uses continuous exponential compounding:
- **Interest Rate**: 20% per day (0.20)
- **Compounding**: Continuous (e^rt formula)
- **Tier Completion**: Principal doubles, then continues compounding

## Contributing

See the project repository for contribution guidelines.

## License

See LICENSE file for details.
