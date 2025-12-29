"""Trajectory API endpoints for computing transfer orbits."""
from flask import Blueprint, request, jsonify
from backend.trajectory_solver import get_trajectory_solver
from backend.game_data_loader import get_game_data_loader

trajectory_bp = Blueprint('trajectory', __name__)


def _get_solver():
    """Get trajectory solver with orbital zone data."""
    data_loader = get_game_data_loader()
    orbital_zones = data_loader.load_orbital_mechanics()
    
    # Convert orbital zones list to dictionary keyed by ID
    zones_dict = {}
    if orbital_zones:
        for zone in orbital_zones:
            zones_dict[zone['id']] = zone
    
    return get_trajectory_solver(zones_dict)


@trajectory_bp.route('/compute', methods=['POST'])
def compute_transfer():
    """
    Compute a transfer trajectory between two zones.
    
    Request body:
    {
        "from_zone": "earth",
        "to_zone": "mars",
        "game_time_days": 0,  // optional, default 0
        "num_points": 50,     // optional, default 50
        "planet_positions": { // optional, actual planet positions from frontend
            "earth": [1.0, 0.0],
            "mars": [0.5, 1.4],
            ...
        }
    }
    
    Response:
    {
        "success": true,
        "trajectory": {
            "from_zone": "earth",
            "to_zone": "mars",
            "departure_time_days": 0,
            "arrival_time_days": 258.8,
            "transfer_time_days": 258.8,
            "departure_position_au": [1.0, 0.0],
            "arrival_position_au": [-1.52, 0.0],
            "trajectory_points_au": [[x, y], ...],
            "delta_v_km_s": 5.57
        }
    }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    from_zone = data.get('from_zone')
    to_zone = data.get('to_zone')
    
    if not from_zone or not to_zone:
        return jsonify({'error': 'from_zone and to_zone are required'}), 400
    
    game_time_days = data.get('game_time_days', 0)
    num_points = data.get('num_points', 50)
    planet_positions = data.get('planet_positions')  # Optional: actual positions from frontend
    
    # Limit num_points for performance
    num_points = min(max(10, num_points), 200)
    
    try:
        solver = _get_solver()
        trajectory = solver.compute_transfer(
            from_zone=from_zone,
            to_zone=to_zone,
            game_time_days=game_time_days,
            num_points=num_points,
            planet_positions=planet_positions
        )
        
        return jsonify({
            'success': True,
            'trajectory': trajectory
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@trajectory_bp.route('/compute-gravity-assist', methods=['POST'])
def compute_gravity_assist():
    """
    Compute a transfer trajectory using a gravity assist flyby.
    
    Request body:
    {
        "from_zone": "earth",
        "to_zone": "jupiter",
        "via_zone": "venus",     // gravity assist body
        "game_time_days": 0,     // optional
        "num_points": 50         // optional
    }
    
    Response:
    {
        "success": true,
        "trajectory": {
            "from_zone": "earth",
            "to_zone": "jupiter",
            "via_zone": "venus",
            "trajectory_points_au": [[x, y], ...],
            "total_delta_v_km_s": 8.2,
            "gravity_assist_bonus_km_s": 2.5,
            "is_gravity_assist": true
        }
    }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    from_zone = data.get('from_zone')
    to_zone = data.get('to_zone')
    via_zone = data.get('via_zone')
    
    if not from_zone or not to_zone or not via_zone:
        return jsonify({
            'error': 'from_zone, to_zone, and via_zone are required'
        }), 400
    
    game_time_days = data.get('game_time_days', 0)
    num_points = data.get('num_points', 50)
    num_points = min(max(10, num_points), 200)
    
    try:
        solver = _get_solver()
        trajectory = solver.compute_gravity_assist_transfer(
            from_zone=from_zone,
            to_zone=to_zone,
            via_zone=via_zone,
            game_time_days=game_time_days,
            num_points=num_points
        )
        
        return jsonify({
            'success': True,
            'trajectory': trajectory
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@trajectory_bp.route('/batch', methods=['POST'])
def compute_batch():
    """
    Compute multiple transfer trajectories at once.
    
    Request body:
    {
        "transfers": [
            {"from_zone": "earth", "to_zone": "mars"},
            {"from_zone": "mars", "to_zone": "jupiter"},
            ...
        ],
        "game_time_days": 0,
        "num_points": 30,
        "planet_positions": {  // optional, actual positions from frontend
            "earth": [1.0, 0.0],
            "mars": [0.5, 1.4],
            ...
        }
    }
    
    Response:
    {
        "success": true,
        "trajectories": [
            {...trajectory data...},
            ...
        ],
        "computation_time_ms": 123.45
    }
    """
    import time
    start_time = time.perf_counter()
    
    data = request.get_json()
    
    if not data or 'transfers' not in data:
        return jsonify({'error': 'transfers array is required'}), 400
    
    transfers = data['transfers']
    if not isinstance(transfers, list):
        return jsonify({'error': 'transfers must be an array'}), 400
    
    # Limit batch size
    if len(transfers) > 20:
        return jsonify({
            'error': 'Maximum 20 transfers per batch'
        }), 400
    
    game_time_days = data.get('game_time_days', 0)
    num_points = min(max(10, data.get('num_points', 30)), 100)
    planet_positions = data.get('planet_positions')  # Optional: actual positions from frontend
    
    try:
        solver = _get_solver()
        trajectories = []
        
        for transfer in transfers:
            from_zone = transfer.get('from_zone')
            to_zone = transfer.get('to_zone')
            via_zone = transfer.get('via_zone')
            
            if not from_zone or not to_zone:
                trajectories.append({
                    'error': 'from_zone and to_zone required'
                })
                continue
            
            if via_zone:
                # Gravity assist transfer
                traj = solver.compute_gravity_assist_transfer(
                    from_zone=from_zone,
                    to_zone=to_zone,
                    via_zone=via_zone,
                    game_time_days=game_time_days,
                    num_points=num_points,
                    planet_positions=planet_positions
                )
            else:
                # Direct transfer
                traj = solver.compute_transfer(
                    from_zone=from_zone,
                    to_zone=to_zone,
                    game_time_days=game_time_days,
                    num_points=num_points,
                    planet_positions=planet_positions
                )
            
            trajectories.append(traj)
        
        end_time = time.perf_counter()
        computation_time_ms = (end_time - start_time) * 1000
        
        return jsonify({
            'success': True,
            'trajectories': trajectories,
            'computation_time_ms': computation_time_ms
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@trajectory_bp.route('/zones', methods=['GET'])
def get_zones():
    """
    Get all available orbital zones with their properties.
    
    Response:
    {
        "zones": [
            {
                "id": "earth",
                "name": "Earth Orbit",
                "radius_au": 1.0,
                "escape_delta_v_km_s": 3.2,
                ...
            },
            ...
        ]
    }
    """
    try:
        data_loader = get_game_data_loader()
        orbital_zones = data_loader.load_orbital_mechanics()
        
        if orbital_zones:
            return jsonify({
                'success': True,
                'zones': orbital_zones
            })
        else:
            return jsonify({
                'success': False,
                'error': 'No orbital zone data available'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

