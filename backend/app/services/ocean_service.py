"""
SAMUDRA-3D Core Ocean Data Service
Delegates dynamically to BaseOceanAdapter instances based on DatasetRegistry.
Maintains 100% backward compatibility with existing tests, routes, and services.
"""
from pathlib import Path
from typing import Optional, Dict, Any, List
import numpy as np

from backend.app.core.config import settings
from backend.app.data.registry import dataset_registry, SourceMode
from backend.app.data.adapters import (
    BaseOceanAdapter,
    SyntheticRomsAdapter,
    GlorysLocalAdapter,
    calculate_derived_ocean_metrics
)
from backend.app.schemas.ocean import (
    OceanMetadataResponse,
    OceanDataSliceResponse,
    OceanProbeResponse,
    OceanTransectResponse
)


class OceanDataService:
    def __init__(self, nc_path: Optional[Path] = None, argo_path: Optional[Path] = None):
        synth_path = nc_path or settings.SYNTHETIC_NETCDF_PATH
        self.adapters: Dict[str, BaseOceanAdapter] = {
            "incois_roms_synthetic": SyntheticRomsAdapter(nc_path=synth_path)
        }

        # Check if real GLORYS dataset is present
        glorys_desc = dataset_registry.get_dataset("cmems_mod_glo_phy_my_0.083deg_P1D-m")
        if glorys_desc and glorys_desc.local_path and Path(glorys_desc.local_path).exists():
            self.adapters["cmems_mod_glo_phy_my_0.083deg_P1D-m"] = GlorysLocalAdapter(Path(glorys_desc.local_path))

    def get_active_adapter(self) -> BaseOceanAdapter:
        active_desc = dataset_registry.get_active_dataset()
        dataset_id = active_desc.dataset_id if active_desc else "incois_roms_synthetic"
        if dataset_id in self.adapters:
            return self.adapters[dataset_id]
        return self.adapters["incois_roms_synthetic"]

    def set_active_dataset(self, dataset_id: str):
        dataset_registry.set_active_dataset(dataset_id)
        if dataset_id not in self.adapters:
            desc = dataset_registry.get_dataset(dataset_id)
            if desc and desc.local_path and Path(desc.local_path).exists():
                self.adapters[dataset_id] = GlorysLocalAdapter(Path(desc.local_path))
        adapter = self.get_active_adapter()
        if not adapter.is_loaded():
            adapter.load_dataset()

    @property
    def nc_path(self) -> Path:
        adapter = self.get_active_adapter()
        return getattr(adapter, "nc_path", settings.SYNTHETIC_NETCDF_PATH)

    @property
    def dataset(self):
        adapter = self.get_active_adapter()
        if not adapter.is_loaded():
            adapter.load_dataset()
        return getattr(adapter, "dataset", None)

    @property
    def times(self) -> np.ndarray:
        if hasattr(self, "_override_times") and self._override_times is not None:
            return self._override_times
        adapter = self.get_active_adapter()
        if not adapter.is_loaded():
            adapter.load_dataset()
        return adapter.times

    @times.setter
    def times(self, val: np.ndarray):
        self._override_times = val

    @property
    def time_timestamps(self) -> List[str]:
        adapter = self.get_active_adapter()
        if not adapter.is_loaded():
            adapter.load_dataset()
        return adapter.time_timestamps

    @property
    def depths(self) -> np.ndarray:
        if hasattr(self, "_override_depths") and self._override_depths is not None:
            return self._override_depths
        adapter = self.get_active_adapter()
        if not adapter.is_loaded():
            adapter.load_dataset()
        return adapter.depths

    @depths.setter
    def depths(self, val: np.ndarray):
        self._override_depths = val

    @property
    def lats(self) -> np.ndarray:
        if hasattr(self, "_override_lats") and self._override_lats is not None:
            return self._override_lats
        adapter = self.get_active_adapter()
        if not adapter.is_loaded():
            adapter.load_dataset()
        return adapter.lats

    @lats.setter
    def lats(self, val: np.ndarray):
        self._override_lats = val

    @property
    def lons(self) -> np.ndarray:
        if hasattr(self, "_override_lons") and self._override_lons is not None:
            return self._override_lons
        adapter = self.get_active_adapter()
        if not adapter.is_loaded():
            adapter.load_dataset()
        return adapter.lons

    @lons.setter
    def lons(self, val: np.ndarray):
        self._override_lons = val

    def is_loaded(self) -> bool:
        return self.get_active_adapter().is_loaded()

    def load_dataset(self):
        self.get_active_adapter().load_dataset()

    def close(self):
        for adp in self.adapters.values():
            if adp.is_loaded():
                adp.close()

    def get_metadata(self) -> OceanMetadataResponse:
        return self.get_active_adapter().get_metadata()

    def slice_data(
        self,
        variable: str,
        time_idx: int = 0,
        depth: float = 0.0,
        lat_min: Optional[float] = None,
        lat_max: Optional[float] = None,
        lon_min: Optional[float] = None,
        lon_max: Optional[float] = None
    ) -> OceanDataSliceResponse:
        return self.get_active_adapter().slice_data(
            variable=variable,
            time_idx=time_idx,
            depth=depth,
            lat_min=lat_min,
            lat_max=lat_max,
            lon_min=lon_min,
            lon_max=lon_max
        )

    def probe_water_column(
        self,
        lat: float,
        lon: float,
        time_idx: int = 0
    ) -> OceanProbeResponse:
        return self.get_active_adapter().probe_water_column(
            lat=lat,
            lon=lon,
            time_idx=time_idx
        )

    def extract_transect(
        self,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float,
        variable: str = "temperature",
        time_idx: int = 0
    ) -> OceanTransectResponse:
        return self.get_active_adapter().extract_transect(
            lat1=lat1,
            lon1=lon1,
            lat2=lat2,
            lon2=lon2,
            variable=variable,
            time_idx=time_idx
        )

    @staticmethod
    def calculate_derived_metrics(depths: Any, temps: Any) -> Dict[str, Any]:
        return calculate_derived_ocean_metrics(depths, temps)


ocean_service = OceanDataService()
