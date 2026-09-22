"""Initial SAMUDRA-3D PostgreSQL Schema Migration

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-22 19:50:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Roles & Users
    op.create_table(
        'roles',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=64), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('permissions', sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_roles_id'), 'roles', ['id'], unique=False)

    op.create_table(
        'users',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('username', sa.String(length=64), nullable=False),
        sa.Column('password_hash', sa.String(length=256), nullable=False),
        sa.Column('salt', sa.String(length=64), nullable=False),
        sa.Column('full_name', sa.String(length=128), nullable=False),
        sa.Column('email', sa.String(length=128), nullable=True),
        sa.Column('role', sa.String(length=32), nullable=False),
        sa.Column('clearance_level', sa.String(length=64), nullable=False),
        sa.Column('organization', sa.String(length=128), nullable=False),
        sa.Column('avatar_initials', sa.String(length=8), nullable=False),
        sa.Column('badge_color', sa.String(length=32), nullable=False),
        sa.Column('capabilities', sa.JSON(), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)

    op.create_table(
        'sessions',
        sa.Column('token', sa.String(length=128), nullable=False),
        sa.Column('user_id', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('token')
    )
    op.create_index(op.f('ix_sessions_token'), 'sessions', ['token'], unique=False)
    op.create_index(op.f('ix_sessions_user_id'), 'sessions', ['user_id'], unique=False)

    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('actor', sa.String(length=64), nullable=False),
        sa.Column('user_id', sa.String(length=64), nullable=True),
        sa.Column('action', sa.String(length=128), nullable=False),
        sa.Column('target', sa.String(length=256), nullable=True),
        sa.Column('result', sa.String(length=32), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('details', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_audit_logs_timestamp'), 'audit_logs', ['timestamp'], unique=False)
    op.create_index(op.f('ix_audit_logs_user_id'), 'audit_logs', ['user_id'], unique=False)

    # 2. Datasets
    op.create_table(
        'datasets',
        sa.Column('dataset_id', sa.String(length=128), nullable=False),
        sa.Column('name', sa.String(length=256), nullable=False),
        sa.Column('provider', sa.String(length=128), nullable=False),
        sa.Column('product_id', sa.String(length=128), nullable=True),
        sa.Column('source_mode', sa.String(length=32), nullable=False),
        sa.Column('access_method', sa.String(length=64), nullable=False),
        sa.Column('local_path', sa.String(length=512), nullable=True),
        sa.Column('remote_url', sa.String(length=512), nullable=True),
        sa.Column('format', sa.String(length=32), nullable=False),
        sa.Column('variables', sa.JSON(), nullable=False),
        sa.Column('raw_variables', sa.JSON(), nullable=False),
        sa.Column('units', sa.JSON(), nullable=False),
        sa.Column('spatial_resolution', sa.String(length=64), nullable=True),
        sa.Column('spatial_resolution_km', sa.Float(), nullable=True),
        sa.Column('temporal_resolution', sa.String(length=64), nullable=True),
        sa.Column('coverage', sa.JSON(), nullable=False),
        sa.Column('depth_range', sa.JSON(), nullable=False),
        sa.Column('time_range', sa.JSON(), nullable=False),
        sa.Column('size_bytes', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('provenance', sa.Text(), nullable=True),
        sa.Column('license', sa.String(length=128), nullable=True),
        sa.Column('checksum', sa.String(length=128), nullable=True),
        sa.Column('last_verified', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_updated', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('dataset_id')
    )
    op.create_index(op.f('ix_datasets_dataset_id'), 'datasets', ['dataset_id'], unique=False)

    op.create_table(
        'dataset_versions',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('dataset_id', sa.String(length=128), nullable=False),
        sa.Column('version_number', sa.String(length=32), nullable=False),
        sa.Column('released_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('changes_summary', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['dataset_id'], ['datasets.dataset_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_dataset_versions_dataset_id'), 'dataset_versions', ['dataset_id'], unique=False)
    op.create_index(op.f('ix_dataset_versions_id'), 'dataset_versions', ['id'], unique=False)

    op.create_table(
        'dataset_files',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('dataset_id', sa.String(length=128), nullable=False),
        sa.Column('file_path', sa.String(length=512), nullable=False),
        sa.Column('file_size_bytes', sa.Integer(), nullable=False),
        sa.Column('sha256_hash', sa.String(length=64), nullable=True),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['dataset_id'], ['datasets.dataset_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_dataset_files_dataset_id'), 'dataset_files', ['dataset_id'], unique=False)
    op.create_index(op.f('ix_dataset_files_id'), 'dataset_files', ['id'], unique=False)

    op.create_table(
        'dataset_variables',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('dataset_id', sa.String(length=128), nullable=False),
        sa.Column('variable_name', sa.String(length=64), nullable=False),
        sa.Column('standard_name', sa.String(length=128), nullable=True),
        sa.Column('long_name', sa.String(length=256), nullable=True),
        sa.Column('units', sa.String(length=32), nullable=False),
        sa.Column('min_value', sa.Float(), nullable=True),
        sa.Column('max_value', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['dataset_id'], ['datasets.dataset_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_dataset_variables_dataset_id'), 'dataset_variables', ['dataset_id'], unique=False)
    op.create_index(op.f('ix_dataset_variables_id'), 'dataset_variables', ['id'], unique=False)

    # 3. Observation Platforms & Profiles
    op.create_table(
        'observation_platforms',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('platform_type', sa.String(length=32), nullable=False),
        sa.Column('wmo_id', sa.String(length=32), nullable=True),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('agency', sa.String(length=128), nullable=False),
        sa.Column('deployment_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('lat', sa.Float(), nullable=False),
        sa.Column('lon', sa.Float(), nullable=False),
        sa.Column('source_mode', sa.String(length=32), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_by', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_observation_platforms_id'), 'observation_platforms', ['id'], unique=False)
    op.create_index(op.f('ix_observation_platforms_lat'), 'observation_platforms', ['lat'], unique=False)
    op.create_index(op.f('ix_observation_platforms_lon'), 'observation_platforms', ['lon'], unique=False)
    op.create_index(op.f('ix_observation_platforms_platform_type'), 'observation_platforms', ['platform_type'], unique=False)
    op.create_index(op.f('ix_observation_platforms_wmo_id'), 'observation_platforms', ['wmo_id'], unique=False)

    op.create_table(
        'observation_profiles',
        sa.Column('id', sa.String(length=128), nullable=False),
        sa.Column('platform_id', sa.String(length=64), nullable=False),
        sa.Column('cycle_number', sa.Integer(), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('lat', sa.Float(), nullable=False),
        sa.Column('lon', sa.Float(), nullable=False),
        sa.Column('max_depth_m', sa.Float(), nullable=False),
        sa.Column('qc_status', sa.String(length=32), nullable=True),
        sa.Column('data_source_mode', sa.String(length=32), nullable=True),
        sa.Column('depths', sa.JSON(), nullable=False),
        sa.Column('temperature', sa.JSON(), nullable=False),
        sa.Column('salinity', sa.JSON(), nullable=False),
        sa.Column('pressure', sa.JSON(), nullable=True),
        sa.Column('qc_flags', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['platform_id'], ['observation_platforms.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_observation_profiles_id'), 'observation_profiles', ['id'], unique=False)
    op.create_index(op.f('ix_observation_profiles_lat'), 'observation_profiles', ['lat'], unique=False)
    op.create_index(op.f('ix_observation_profiles_lon'), 'observation_profiles', ['lon'], unique=False)
    op.create_index(op.f('ix_observation_profiles_platform_id'), 'observation_profiles', ['platform_id'], unique=False)
    op.create_index(op.f('ix_observation_profiles_timestamp'), 'observation_profiles', ['timestamp'], unique=False)

    op.create_table(
        'observation_measurements',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('profile_id', sa.String(length=128), nullable=False),
        sa.Column('depth_m', sa.Float(), nullable=False),
        sa.Column('variable', sa.String(length=32), nullable=False),
        sa.Column('value', sa.Float(), nullable=False),
        sa.Column('qc_flag', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['profile_id'], ['observation_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_observation_measurements_profile_id'), 'observation_measurements', ['profile_id'], unique=False)

    op.create_table(
        'glider_transects',
        sa.Column('id', sa.String(length=128), nullable=False),
        sa.Column('platform_id', sa.String(length=64), nullable=False),
        sa.Column('mission_name', sa.String(length=128), nullable=False),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('waypoints', sa.JSON(), nullable=False),
        sa.Column('variables', sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(['platform_id'], ['observation_platforms.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_glider_transects_id'), 'glider_transects', ['id'], unique=False)
    op.create_index(op.f('ix_glider_transects_platform_id'), 'glider_transects', ['platform_id'], unique=False)

    # 4. Locations & Saved Locations
    op.create_table(
        'locations',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('category', sa.String(length=64), nullable=False),
        sa.Column('lat', sa.Float(), nullable=False),
        sa.Column('lon', sa.Float(), nullable=False),
        sa.Column('zoom_distance', sa.Float(), nullable=False),
        sa.Column('bbox', sa.JSON(), nullable=True),
        sa.Column('description', sa.String(length=256), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_locations_id'), 'locations', ['id'], unique=False)
    op.create_index(op.f('ix_locations_lat'), 'locations', ['lat'], unique=False)
    op.create_index(op.f('ix_locations_lon'), 'locations', ['lon'], unique=False)
    op.create_index(op.f('ix_locations_name'), 'locations', ['name'], unique=False)

    op.create_table(
        'saved_locations',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('user_id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('lat', sa.Float(), nullable=False),
        sa.Column('lon', sa.Float(), nullable=False),
        sa.Column('zoom_distance', sa.Float(), nullable=False),
        sa.Column('depth_m', sa.Float(), nullable=False),
        sa.Column('variable', sa.String(length=32), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_saved_locations_id'), 'saved_locations', ['id'], unique=False)
    op.create_index(op.f('ix_saved_locations_user_id'), 'saved_locations', ['user_id'], unique=False)

    # 5. Analysis Runs, Collocations, Anomalies
    op.create_table(
        'analysis_runs',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('user_id', sa.String(length=64), nullable=True),
        sa.Column('run_type', sa.String(length=64), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('parameters', sa.JSON(), nullable=False),
        sa.Column('metrics', sa.JSON(), nullable=False),
        sa.Column('execution_time_ms', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_analysis_runs_id'), 'analysis_runs', ['id'], unique=False)
    op.create_index(op.f('ix_analysis_runs_run_type'), 'analysis_runs', ['run_type'], unique=False)
    op.create_index(op.f('ix_analysis_runs_user_id'), 'analysis_runs', ['user_id'], unique=False)

    op.create_table(
        'collocation_results',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('run_id', sa.String(length=64), nullable=False),
        sa.Column('platform_id', sa.String(length=64), nullable=False),
        sa.Column('profile_id', sa.String(length=128), nullable=True),
        sa.Column('variable', sa.String(length=32), nullable=False),
        sa.Column('bias', sa.Float(), nullable=False),
        sa.Column('mae', sa.Float(), nullable=False),
        sa.Column('rmse', sa.Float(), nullable=False),
        sa.Column('correlation_r', sa.Float(), nullable=True),
        sa.Column('sample_count', sa.Integer(), nullable=False),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['platform_id'], ['observation_platforms.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['profile_id'], ['observation_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['run_id'], ['analysis_runs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_collocation_results_id'), 'collocation_results', ['id'], unique=False)
    op.create_index(op.f('ix_collocation_results_platform_id'), 'collocation_results', ['platform_id'], unique=False)
    op.create_index(op.f('ix_collocation_results_profile_id'), 'collocation_results', ['profile_id'], unique=False)
    op.create_index(op.f('ix_collocation_results_run_id'), 'collocation_results', ['run_id'], unique=False)

    op.create_table(
        'anomalies',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('run_id', sa.String(length=64), nullable=False),
        sa.Column('lat', sa.Float(), nullable=False),
        sa.Column('lon', sa.Float(), nullable=False),
        sa.Column('depth_m', sa.Float(), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('variable', sa.String(length=32), nullable=False),
        sa.Column('observed_value', sa.Float(), nullable=False),
        sa.Column('model_value', sa.Float(), nullable=False),
        sa.Column('delta', sa.Float(), nullable=False),
        sa.Column('threshold', sa.Float(), nullable=False),
        sa.Column('platform_id', sa.String(length=64), nullable=True),
        sa.Column('support_radius_km', sa.Float(), nullable=True),
        sa.Column('severity', sa.String(length=32), nullable=True),
        sa.ForeignKeyConstraint(['run_id'], ['analysis_runs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_anomalies_id'), 'anomalies', ['id'], unique=False)
    op.create_index(op.f('ix_anomalies_lat'), 'anomalies', ['lat'], unique=False)
    op.create_index(op.f('ix_anomalies_lon'), 'anomalies', ['lon'], unique=False)
    op.create_index(op.f('ix_anomalies_platform_id'), 'anomalies', ['platform_id'], unique=False)
    op.create_index(op.f('ix_anomalies_run_id'), 'anomalies', ['run_id'], unique=False)

    # 6. Download Jobs & Cache Entries
    op.create_table(
        'download_jobs',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('user_id', sa.String(length=64), nullable=True),
        sa.Column('dataset_id', sa.String(length=128), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('parameters', sa.JSON(), nullable=False),
        sa.Column('estimated_download_mb', sa.Float(), nullable=False),
        sa.Column('expanded_logical_mb', sa.Float(), nullable=False),
        sa.Column('progress_percent', sa.Float(), nullable=False),
        sa.Column('output_file_path', sa.String(length=512), nullable=True),
        sa.Column('sha256_hash', sa.String(length=64), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['dataset_id'], ['datasets.dataset_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_download_jobs_dataset_id'), 'download_jobs', ['dataset_id'], unique=False)
    op.create_index(op.f('ix_download_jobs_id'), 'download_jobs', ['id'], unique=False)
    op.create_index(op.f('ix_download_jobs_user_id'), 'download_jobs', ['user_id'], unique=False)

    op.create_table(
        'cache_entries',
        sa.Column('key_hash', sa.String(length=64), nullable=False),
        sa.Column('dataset_id', sa.String(length=128), nullable=False),
        sa.Column('query_type', sa.String(length=32), nullable=False),
        sa.Column('parameters_json', sa.Text(), nullable=False),
        sa.Column('file_path', sa.String(length=512), nullable=True),
        sa.Column('size_bytes', sa.Integer(), nullable=False),
        sa.Column('access_count', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_accessed', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['dataset_id'], ['datasets.dataset_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('key_hash')
    )
    op.create_index(op.f('ix_cache_entries_dataset_id'), 'cache_entries', ['dataset_id'], unique=False)
    op.create_index(op.f('ix_cache_entries_key_hash'), 'cache_entries', ['key_hash'], unique=False)
    op.create_index(op.f('ix_cache_entries_query_type'), 'cache_entries', ['query_type'], unique=False)

def downgrade() -> None:
    op.drop_table('cache_entries')
    op.drop_table('download_jobs')
    op.drop_table('anomalies')
    op.drop_table('collocation_results')
    op.drop_table('analysis_runs')
    op.drop_table('saved_locations')
    op.drop_table('locations')
    op.drop_table('glider_transects')
    op.drop_table('observation_measurements')
    op.drop_table('observation_profiles')
    op.drop_table('observation_platforms')
    op.drop_table('dataset_variables')
    op.drop_table('dataset_files')
    op.drop_table('dataset_versions')
    op.drop_table('datasets')
    op.drop_table('audit_logs')
    op.drop_table('sessions')
    op.drop_table('users')
    op.drop_table('roles')
