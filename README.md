# Board Route Optimizer

[![Python](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Code Style: Black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

A comprehensive route optimization system for poster board maintenance using TSP (Traveling Salesman Problem) algorithms. Optimizes walking routes for efficient poster board management with privacy-conscious location handling.

## 🌟 Features

### Core Optimization
- **🔍 Optimal Starting Point Discovery**: Automatically finds the best starting location for each route
- **🚶 Walking Route Optimization**: Specialized for pedestrian navigation with realistic time estimates
- **🗺️ Multiple Distance Calculation Methods**: 
  - Road-based distances via OpenRouteService API
  - Straight-line distances as fallback
- **⚡ 2-opt Algorithm**: Advanced route improvement for minimal travel distance

### Data Management & Privacy
- **🔒 Personal Information Protection**: Automatically anonymizes personal residence references
- **📍 Voting Office Integration**: Seamlessly integrates polling place locations
- **🏷️ Board Number Normalization**: Standardizes identification numbers
- **📊 GeoJSON Export**: Web-ready geographic data format

### Web Interface
- **🌐 Interactive Map**: Modern web interface with Leaflet.js
- **📱 Mobile-Responsive**: Optimized for tablets and smartphones used in the field
- **🔍 Advanced Search**: Quick district and location finding
- **📍 Google Maps Integration**: One-click navigation for individual route segments
- **📋 Copy-to-Clipboard**: Easy address copying for field use

## 🚀 Quick Start

### Prerequisites

- Python 3.9 or higher
- [uv](https://github.com/astral-sh/uv) package manager (recommended) or pip

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ota2000/inzai-election-board.git
   cd inzai-election-board
   ```

2. **Install dependencies**
   ```bash
   # Using uv (recommended)
   uv sync
   
   # Or using pip
   pip install -e .
   ```

3. **Prepare your data** (see [Data Format](#-data-format) section)
   ```
   data/
   ├── poster_board_locations.csv
   └── polling_places.csv
   ```

4. **Run optimization**
   ```bash
   # Using uv
   uv run board-route-optimizer
   
   # Or directly
   python -m board_route_optimizer.cli
   ```

5. **View results**
   Open `docs/index.html` in your web browser to view the interactive map.

## 📊 Data Format

### Poster Board Locations (`data/poster_board_locations.csv`)

| Column | Description | Example |
|--------|-------------|---------|
| `投票区` | Voting district ID | `第01投票区: 中央南` |
| `設置場所名` | Location name | `市民会館前` |
| `住所` | Address | `東京都○○市○○町1-1` |
| `緯度` | Latitude | `35.8327` |
| `経度` | Longitude | `140.1451` |

### Polling Places (`data/polling_places.csv`)

| Column | Description | Example |
|--------|-------------|---------|
| `polling_place_name` | Polling place name | `中央南` |
| `address` | Address | `東京都○○市○○町2-2` |
| `district_number` | District number | `第1投票区` |
| `latitude` | Latitude | `35.8330` |
| `longitude` | Longitude | `140.1455` |

## 🛠️ Usage

### Command Line Interface

```bash
# Basic usage
board-route-optimizer

# Specify custom data files
board-route-optimizer --poster-csv data/my_boards.csv --polling-csv data/my_offices.csv

# Use API for road distances
board-route-optimizer --api-key YOUR_OPENROUTESERVICE_API_KEY

# Custom output location
board-route-optimizer --output results/routes.geojson

# Configuration from file
board-route-optimizer --config config.json
```

### Python API

```python
from board_route_optimizer import RouteOptimizer, Config

# Create configuration
config = Config()
config.data.poster_board_csv = "data/poster_board_locations.csv"
config.data.polling_places_csv = "data/polling_places.csv"

# Initialize optimizer
optimizer = RouteOptimizer(config)

# Run optimization
results = optimizer.optimize_all_districts()

# Export to GeoJSON
optimizer.export_geojson("output/routes.geojson")

# Print summary
optimizer.print_summary()
```

### Configuration File

Create a `config.json` file for custom settings:

```json
{
  "api": {
    "request_delay": 2.0,
    "timeout": 30
  },
  "optimization": {
    "walking_speed_kmh": 4.0,
    "max_tsp_iterations": 50
  },
  "data": {
    "anonymize_personal_names": true,
    "output_directory": "docs/data"
  }
}
```

## 🗺️ Web Interface

The system generates an interactive web interface at `docs/index.html` with:

- **District Selection**: Quick access to all voting districts
- **Route Visualization**: Color-coded optimal routes
- **Segment Details**: Distance and time for each route segment
- **Google Maps Integration**: Direct navigation links
- **Mobile Support**: Touch-friendly interface for field use

### Web Interface Features

- 🔍 **Search Districts**: Find districts quickly by name or number
- 📍 **Interactive Markers**: Click for detailed location information
- 📊 **Route Statistics**: View distance, time, and efficiency metrics
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile
- 🗺️ **Multiple Views**: Switch between all districts and individual routes

## 📁 Project Structure

```
board-route-optimizer/
├── src/board_route_optimizer/       # Python package
│   ├── config.py                    # Configuration management
│   ├── cli.py                       # Command line interface
│   ├── core/                        # Core algorithms
│   │   ├── optimizer.py             # Main optimization engine
│   │   └── tsp_solver.py            # TSP solving algorithms
│   ├── data/                        # Data handling
│   │   └── loader.py                # Data loading and preprocessing
│   ├── utils/                       # Utilities
│   │   └── distance.py              # Distance calculations
│   └── export/                      # Export functionality
│       └── geojson_exporter.py      # GeoJSON export
├── docs/                            # Web interface
│   ├── js/                          # JavaScript modules
│   ├── css/                         # Stylesheets
│   ├── data/                        # Generated data files
│   └── index.html                   # Main interface
├── data/                            # Input data
│   ├── poster_board_locations.csv   # Poster board data
│   └── polling_places.csv           # Polling place data
├── tests/                           # Test suite
└── pyproject.toml                   # Project configuration
```

## 🔧 Configuration Options

### API Settings
- `openrouteservice_base_url`: API endpoint
- `api_key`: Your OpenRouteService API key
- `request_delay`: Delay between API requests (seconds)
- `timeout`: Request timeout (seconds)

### Optimization Settings
- `walking_speed_kmh`: Average walking speed
- `max_tsp_iterations`: Maximum optimization iterations
- `tsp_improvement_threshold`: Minimum improvement threshold

### Data Settings
- `anonymize_personal_names`: Enable privacy protection
- `output_directory`: Directory for generated files
- `output_filename`: Name of generated GeoJSON file

## 🔒 Privacy Features

The system includes comprehensive privacy protection:

- **Personal Name Anonymization**: Automatically replaces personal residence references
- **Configurable Patterns**: Customizable anonymization rules
- **Data Sanitization**: Removes sensitive information from exports
- **Audit Trail**: Logs all data transformations

## 🧪 Testing

Run the test suite:

```bash
# Using uv
uv run pytest

# Or directly
python -m pytest tests/
```

## 📚 API Documentation

### RouteOptimizer Class

The main optimization engine with methods for:
- `load_data()`: Load and preprocess input data
- `optimize_all_districts()`: Run optimization for all districts
- `export_geojson()`: Export results to GeoJSON format
- `get_summary_statistics()`: Get optimization statistics

### Config Class

Configuration management with sections for:
- `APIConfig`: API-related settings
- `OptimizationConfig`: Algorithm parameters
- `DataConfig`: Data processing options

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [OpenRouteService](https://openrouteservice.org/) for routing API
- [Leaflet.js](https://leafletjs.com/) for web mapping
- [GeoPy](https://geopy.readthedocs.io/) for geographic calculations

## 📞 Support

- 📧 Email: ota2000@ota2000.com
- 🐛 Issues: [GitHub Issues](https://github.com/ota2000/inzai-election-board/issues)
- 📖 Documentation: [GitHub README](https://github.com/ota2000/inzai-election-board#readme)

---

**Board Route Optimizer** - Making poster board maintenance more efficient, one route at a time. 🗳️✨