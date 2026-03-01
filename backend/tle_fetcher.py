import requests
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List
import tempfile
import sgp4

class TLEFetcher:
    """Fetches and caches TLE data from CelesTrak"""
    
    BASE_URL = "https://celestrak.org/NORAD/elements/gp.php"
    
    # Available satellite groups from CelesTrak
    GROUPS = {
        "starlink": "Starlink satellites",
        "gps-ops": "GPS operational satellites",
        "glonass-ops": "GLONASS operational satellites",
        "galileo": "Galileo satellites",
        "beidou": "Beidou satellites",
        "stations": "Space stations (ISS, Tiangong)",
        "active": "Active satellites",
        "analyst": "Analyst satellites",
        "weather": "Weather satellites",
        "noaa": "NOAA satellites",
        "goes": "GOES satellites",
        "resource": "Earth resources satellites",
        "sarsat": "Search & rescue satellites",
        "dmc": "Disaster monitoring satellites",
        "tdrss": "Tracking and data relay satellites",
        "argos": "ARGOS data collection satellites",
        "planet": "Planet Labs satellites",
        "spire": "Spire satellites",
        "geo": "Geostationary satellites",
        "intelsat": "Intelsat satellites",
        "ses": "SES satellites",
        "iridium": "Iridium satellites",
        "iridium-NEXT": "Iridium NEXT satellites",
        "orbcomm": "Orbcomm satellites",
        "globalstar": "Globalstar satellites",
        "amateur": "Amateur radio satellites",
        "x-comm": "Experimental communication satellites",
        "other-comm": "Other communication satellites",
        "gorizont": "Gorizont satellites",
        "raduga": "Raduga satellites",
        "molniya": "Molniya satellites",
        "gnss": "All GNSS satellites",
        "musson": "Russian LEO navigation",
        "science": "Space & Earth science satellites",
        "geodetic": "Geodetic satellites",
        "engineering": "Engineering satellites",
        "education": "Education satellites"
    }
    
    def __init__(self, cache_dir: str = "backend/data/tles"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.cache_duration = timedelta(hours=12)  # TLE refresh timer
    
    def _get_cache_path(self, group: str) -> Path:
        return self.cache_dir / f"{group}.json"
    
    def _is_cache_valid(self, group: str) -> bool:
        cache_path = self._get_cache_path(group)
        if not cache_path.exists():
            return False
        
        # Check if cache is older than cache_duration
        cache_time = datetime.fromtimestamp(cache_path.stat().st_mtime)
        return datetime.now() - cache_time < self.cache_duration
    
    def _parse_tle_scientific(self, s: str) -> float:
        """Parse TLE scientific notation format (e.g., '+21756-3' -> 0.21756e-3)"""
        if s[1:-2] == '00000':
            return 0.0
        # TLE format: ±NNNNN±N where ±NNNNN is mantissa and ±N is exponent
        # Need to insert decimal point and 'e' for standard scientific notation
        if s[0] == '-':
            result = float(s[0]+'1')*float('0.' +s[1:6])*(10**(float(s[6]+'1')*float(s[7])))
        else:
            result = float(s[0]+'1')*float('0.' +s[1:6])*(10**(float(s[6]+'1')*float(s[7])))
        
        return result
       
    
    def _parse_tle_line1(self, line1: str) -> Dict:
        """Parse TLE line 1 to extract orbital elements"""
        # TLE Line 1 format (columns are fixed-width)
        # 1 NNNNNC NNNNNAAA NNNNN.NNNNNNNN +.NNNNNNNN +NNNNN-N +NNNNN-N N NNNNN
        try:
            return {
                "line_number": int(line1[0:1]),
                "norad_id": int(line1[2:7]),
                "classification": line1[7:8],
                "launch_year": line1[9:11],
                "launch_number": line1[11:14],
                "launch_piece": line1[14:17].strip(),
                "epoch_year": int(line1[18:20]),
                "epoch_day": float(line1[20:32]),
                "mean_motion_dot": float(line1[33:43]),
                "mean_motion_ddot": self._parse_tle_scientific(line1[44:52]),
                "bstar": self._parse_tle_scientific(line1[53:61]),
                "ephemeris_type": int(line1[62:63]) if line1[62:63].strip() else 0,
                "element_set_no": int(line1[64:68]) if line1[64:68].strip() else 0,
            }
        except (ValueError, IndexError) as e:
            print(f"Error parsing TLE line 1: {e}")
            print(f"Line: {line1}")
            return {}
    
    def _parse_tle_line2(self, line2: str) -> Dict:
        """Parse TLE line 2 to extract orbital elements"""
        # TLE Line 2 format (columns are fixed-width)
        # 2 NNNNN NNN.NNNN NNN.NNNN NNNNNNN NNN.NNNN NNN.NNNN NN.NNNNNNNNNNNNNN
        try:
            return {
                "line_number": int(line2[0:1]),
                "norad_id": int(line2[2:7]),
                "inclination": float(line2[8:16]),
                "ra_of_asc_node": float(line2[17:25]),
                "eccentricity": float("0." + line2[26:33]),
                "arg_of_pericenter": float(line2[34:42]),
                "mean_anomaly": float(line2[43:51]),
                "mean_motion": float(line2[52:63]),
                "rev_at_epoch": int(line2[63:68]),
            }
        except (ValueError, IndexError) as e:
            print(f"Error parsing TLE line 2: {e}")
            print(f"Line: {line2}")
            return {}
    
    def fetch_group(self, group: str, force_refresh: bool = False) -> List[Dict]:
        """Fetch TLE data for a specific group"""
        
        if group not in self.GROUPS:
            raise ValueError(f"Unknown group: {group}. Available: {list(self.GROUPS.keys())}")
        
        # Check cache first
        if not force_refresh and self._is_cache_valid(group):
            cache_path = self._get_cache_path(group)
            with open(cache_path, 'r') as f:
                return json.load(f)
        
        # Fetch from CelesTrak using TLE text format
        print(f"Fetching TLEs for group: {group}")
        params = {
            "GROUP": group,
            "FORMAT": "tle"  # Use TLE text format instead of JSON
        }
        
        try:
            response = requests.get(self.BASE_URL, params=params, timeout=30)
            response.raise_for_status()
            
    
            lines = response.text.strip().split('\n')
            
            satellites = []
            for i in range(0, len(lines), 3):
                if i + 2 >= len(lines):
                    break
                
                name = lines[i].strip()
                line1 = lines[i + 1].strip()
                line2 = lines[i + 2].strip()
                
                # Parse orbital elements from TLE lines
                elements1 = self._parse_tle_line1(line1)
                elements2 = self._parse_tle_line2(line2)
                
                # Combine
                satellite = {
                    "name": name,
                    "norad_id": elements1.get("norad_id", 0),
                    "tle_line1": line1,
                    "tle_line2": line2,
                    "group": group,
                }
                
                # Add parsed elements
                satellite.update(elements1)
                satellite.update(elements2)
                
                # Calculate epoch datetime
                epoch_year = elements1.get("epoch_year", 0)
                epoch_day = elements1.get("epoch_day", 0)
                if epoch_year and epoch_day:
                    
                    full_year = 2000 + epoch_year if epoch_year < 57 else 1900 + epoch_year
                    epoch_date = datetime(full_year, 1, 1) + timedelta(days=epoch_day - 1)
                    satellite["epoch"] = epoch_date.isoformat()
                
                satellites.append(satellite)
            
            # Cache the data
            if satellites:
                cache_path = self._get_cache_path(group)
                with tempfile.NamedTemporaryFile('w', dir=self.cache_dir, delete=False, suffix='.tmp') as tmp:
                    json.dump(satellites, tmp, indent=2)
                    tmp_path = tmp.name
                Path(tmp_path).replace(cache_path)
                print(f"Cached {len(satellites)} satellites for group: {group}")
            else:
                print(f"Warning: No satellites parsed for {group}, keeping existing cache")
                # Return existing cache if available rather than empty list
                cache_path = self._get_cache_path(group)
                if cache_path.exists():
                    with open(cache_path, 'r') as f:
                        return json.load(f)
            
            return satellites
        
    
        except requests.RequestException as e:
            print(f"Error fetching TLEs for {group}: {e}")
            # Try to return cached data even if expired
            cache_path = self._get_cache_path(group)
            if cache_path.exists():
                print(f"Returning stale cache for {group}")
                with open(cache_path, 'r') as f:
                    return json.load(f)
            return []
    
    def fetch_all_groups(self, force_refresh: bool = False) -> Dict[str, List[Dict]]:
        """Fetch TLEs for all available groups"""
        all_data = {}
        for group in self.GROUPS.keys():
            all_data[group] = self.fetch_group(group, force_refresh)
        return all_data
    
    def get_satellite_count(self) -> Dict[str, int]:
        """Get count of satellites in each cached group"""
        counts = {}
        for group in self.GROUPS.keys():
            cache_path = self._get_cache_path(group)
            if cache_path.exists():
                with open(cache_path, 'r') as f:
                    data = json.load(f)
                    counts[group] = len(data)
            else:
                counts[group] = 0
        return counts


if __name__ == "__main__":
    fetcher = TLEFetcher()
    
    test_groups = ["stations", "gps-ops"]
    
    for group in test_groups:
        print(f"\n{'='*60}")
        sats = fetcher.fetch_group(group)
        print(f"\n{group}: {len(sats)} satellites")
        if sats:
            sat = sats[0]
            print(f"\nExample satellite:")
            print(f"  Name: {sat['name']}")
            print(f"  NORAD ID: {sat['norad_id']}")
            print(f"  TLE Line 1: {sat['tle_line1']}")
            print(f"  TLE Line 2: {sat['tle_line2']}")
            print(f"  Inclination: {sat.get('inclination', 'N/A')}°")
            print(f"  Mean Motion: {sat.get('mean_motion', 'N/A')} rev/day")
            print(f"  Eccentricity: {sat.get('eccentricity', 'N/A')}")