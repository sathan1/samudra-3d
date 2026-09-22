import json
import hashlib
from typing import Optional, Any, Dict
from pathlib import Path
from backend.app.core.config import settings

class SliceCacheManager:
    """
    Deterministic cache for sliced ocean fields and probe responses.
    Caches small derived payloads in memory and optionally on disk under SAMUDRA_DATA/cache.
    """
    def __init__(self, max_memory_entries: int = 128):
        self._memory_cache: Dict[str, Any] = {}
        self._access_order: list = []
        self._max_entries = max_memory_entries
        self._disk_cache_dir: Optional[Path] = settings.CACHE_DATA_DIR

    def make_key(
        self,
        dataset_id: str,
        variable: str,
        time_idx: int,
        depth: float,
        lat_min: Optional[float] = None,
        lat_max: Optional[float] = None,
        lon_min: Optional[float] = None,
        lon_max: Optional[float] = None,
        version: str = "v1"
    ) -> str:
        raw = f"{dataset_id}:{variable}:{time_idx}:{depth:.2f}:{lat_min}:{lat_max}:{lon_min}:{lon_max}:{version}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]

    def make_volume_key(
        self,
        dataset_id: str,
        variable: str,
        time_idx: int,
        min_lon: Optional[float] = None,
        max_lon: Optional[float] = None,
        min_lat: Optional[float] = None,
        max_lat: Optional[float] = None,
        depth_min: Optional[float] = None,
        depth_max: Optional[float] = None,
        max_lat_samples: int = 48,
        max_lon_samples: int = 48,
        max_depth_samples: int = 24,
        version: str = "v2"
    ) -> str:
        raw = f"vol:{dataset_id}:{variable}:{time_idx}:{min_lon}:{max_lon}:{min_lat}:{max_lat}:{depth_min}:{depth_max}:{max_lat_samples}:{max_lon_samples}:{max_depth_samples}:{version}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]

    def get(self, key: str) -> Optional[Any]:
        # Check memory cache
        if key in self._memory_cache:
            if key in self._access_order:
                self._access_order.remove(key)
            self._access_order.append(key)
            return self._memory_cache[key]

        # Check disk cache
        if self._disk_cache_dir and self._disk_cache_dir.is_dir():
            disk_file = self._disk_cache_dir / f"{key}.json"
            if disk_file.is_file():
                try:
                    with open(disk_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    self.set(key, data, write_disk=False)
                    return data
                except Exception:
                    pass
        return None

    def set(self, key: str, data: Any, write_disk: bool = True):
        # Store in memory cache
        if len(self._access_order) >= self._max_entries:
            oldest = self._access_order.pop(0)
            self._memory_cache.pop(oldest, None)

        self._memory_cache[key] = data
        if key in self._access_order:
            self._access_order.remove(key)
        self._access_order.append(key)

        # Store in disk cache
        if write_disk and self._disk_cache_dir and self._disk_cache_dir.is_dir():
            disk_file = self._disk_cache_dir / f"{key}.json"
            try:
                with open(disk_file, "w", encoding="utf-8") as f:
                    json.dump(data, f)
            except Exception:
                pass

    def clear(self):
        self._memory_cache.clear()
        self._access_order.clear()
        if self._disk_cache_dir and self._disk_cache_dir.is_dir():
            for f in self._disk_cache_dir.glob("*.json"):
                try:
                    f.unlink()
                except Exception:
                    pass

slice_cache = SliceCacheManager()
