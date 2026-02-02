from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import numpy as np
from pathlib import Path
from  backend.tle_fetcher import TLEFetcher
import threading
from sgp4.api import Satrec, jday
from datetime import datetime, timedelta
import os

app = Flask(__name__)

# Enable CORS for all routes
CORS(app, origins=[
    os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000"),
    "http://localhost:5173",  # Vite dev server default
])
# Initialize TLE fetcher
fetcher = TLEFetcher()

# Frontend directory
frontend_dir = Path("../frontend")


def satellite_data_calculations(sat):
    """Calculate additional orbital parameters for a satellite"""
    mean_motion = sat.get("mean_motion", 0)
    if mean_motion > 0:
        # Orbital period in minutes
        period = 1440 / mean_motion  # 1440 = minutes per day
        
        # Semi-major axis (approximate, using simplified formula)
        # a³ = (μ * T²) / (4π²) where μ = 398600.4418 km³/s² for Earth
        mu = 398600.4418  # km³/s²
        T = period * 60  # convert to seconds
        a = (mu * T * T / (4 * 3.14159 * 3.14159)) ** (1/3)
        
        # Perigee and apogee (approximate)
        e = sat.get("eccentricity", 0)
        earth_radius = 6371  # km
        perigee = a * (1 - e) - earth_radius
        apogee = a * (1 + e) - earth_radius

        # Using sgp4 for exact x,y,z positions
        TLE_line1 = sat.get("tle_line1")
        TLE_line2 = sat.get("tle_line2")



        satellite = Satrec.twoline2rv(TLE_line1, TLE_line2)
        now = datetime.now()
        jd, fr = jday(now.year, now.month, now.day, now.hour, now.minute, now.second)
        error, r, v = satellite.sgp4(jd, fr)

        
        
        sat["calculated"] = {
            "orbital_period_minutes": round(period, 2),
            "semi_major_axis_km": round(a, 2),
            "perigee_km": round(perigee, 2),
            "apogee_km": round(apogee, 2),
            "position_km": r,
        }
    return sat


@app.route('/api/groups', methods=['GET'])
def get_groups():
    """Get all available satellite groups with descriptions"""
    groups = [
        {"id": group, "name": desc, "count": 0}
        for group, desc in fetcher.GROUPS.items()
    ]
    return jsonify({"groups": groups})


@app.route('/api/groups/counts', methods=['GET'])
def get_group_counts():
    """Get satellite counts for each group"""
    counts = fetcher.get_satellite_count()
    groups = [
        {"id": group, "name": fetcher.GROUPS[group], "count": count}
        for group, count in counts.items()
    ]
    return jsonify({"groups": groups})


@app.route('/api/satellites/<group>', methods=['GET'])
def get_satellites(group):
    """Get TLE data for a specific satellite group"""
    force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'
    
    try:
        satellites = fetcher.fetch_group(group, force_refresh)
        return jsonify({
            "group": group,
            "count": len(satellites),
            "satellites": [satellite_data_calculations(sat) for sat in satellites]
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Error fetching satellites: {str(e)}"}), 500


@app.route('/api/satellites', methods=['GET'])
def get_all_satellites():
    """
    Get TLE data for multiple groups
    
    Query params:
        groups: Comma-separated list of group names (e.g., "starlink,gps-ops")
                If not provided, returns a subset of interesting groups
        force_refresh: Force refresh from CelesTrak instead of using cache
    """
    groups_param = request.args.get('groups')
    force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'
    
    if groups_param:
        group_list = [g.strip() for g in groups_param.split(",")]
    else:
        # Default to some interesting groups
        group_list = ["starlink", "stations", "gps-ops", "active"]
    
    all_satellites = []
    group_info = {}
    
    for group in group_list:
        try:
            sats = fetcher.fetch_group(group, force_refresh)
            all_satellites.extend(sats)
            group_info[group] = len(sats)
        except ValueError:
            group_info[group] = 0
            continue
    
    return jsonify({
        "total_count": len(all_satellites),
        "groups": group_info,
        "satellites": all_satellites
    })


@app.route('/api/satellite/<int:norad_id>', methods=['GET'])
def get_satellite_by_id(norad_id):
    """Get detailed information for a specific satellite by NORAD ID"""
    # Search through all cached groups
    for group in fetcher.GROUPS.keys():
        cache_path = fetcher._get_cache_path(group)
        if cache_path.exists():
            with open(cache_path, 'r') as f:
                satellites = json.load(f)
                for sat in satellites:
                    if sat.get("norad_id") == norad_id:
                        # Calculate additional orbital parameters
                        mean_motion = sat.get("mean_motion", 0)
                        if mean_motion > 0:

                            return jsonify(satellite_data_calculations(sat))
    
    return jsonify({"error": f"Satellite with NORAD ID {norad_id} not found"}), 404


@app.route('/api/random_satellites/<int:random_n>', methods=['GET'])
def get_random_satellite(random_n):
    """Get a random satellite from the cache"""
    all_satellites = []
    
    # Aggregate all satellites from cached groups
    for group in fetcher.GROUPS.keys():
        cache_path = fetcher._get_cache_path(group)
        if cache_path.exists():
            with open(cache_path, 'r') as f:
                satellites = json.load(f)
                all_satellites.extend(satellites)
    
    if not all_satellites:
        return jsonify({"error": "No satellites found in cache"}), 404
    
    # Use random_n to select a n random satellites
    index = np.random.randint(0, len(all_satellites), size=random_n)
    random_satellites = [satellite_data_calculations(all_satellites[i]) for i in index]

    
    return jsonify(random_satellites)


@app.route('/api/refresh', methods=['POST'])
def refresh_all():
    """Trigger a refresh of all TLE data in the background"""
    def background_refresh():
        fetcher.fetch_all_groups(True)
    
    # Start refresh in background thread
    thread = threading.Thread(target=background_refresh)
    thread.daemon = True
    thread.start()
    
    return jsonify({"message": "TLE refresh started in background"})


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get overall statistics about cached data"""
    counts = fetcher.get_satellite_count()
    total = sum(counts.values())
    
    return jsonify({
        "total_satellites": total,
        "total_groups": len([c for c in counts.values() if c > 0]),
        "groups": counts,
        "cache_duration_hours": fetcher.cache_duration.total_seconds() / 3600
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    # Pre-fetch some common groups on startup
    print("Fetching initial TLE data...")
    fetcher.fetch_all_groups(force_refresh=False)

    
    print("\nStarting Flask server...")
    print("Server running on http://localhost:8000")
    print("API docs: Use tools like curl or Postman to test endpoints")
    print("Press CTRL+C to quit\n")
    
    # Run the Flask app
    app.run(host="0.0.0.0", port=8000, debug=True)