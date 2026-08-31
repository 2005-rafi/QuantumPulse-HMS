import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api';
import CreateLaboratorySheet from './CreateLaboratorySheet';
import { Md3Fab, Icon } from '../../components/md3/Md3Widgets';
import { Md3TestCatalogConfigurator } from '../../components/md3/Md3TestCatalogConfigurator';
import { Md3SearchBar, Md3SegmentedFilter } from '../../components/md3/AdminControls';
import { Md3EmptyState } from '../../components/md3/Md3EmptyState';
import Md3Pagination from '../../components/md3/Md3Pagination';
import usePagination from '../../hooks/usePagination';
import LaboratoryCard from '../../components/laboratories/LaboratoryCard';
import LaboratoryListView from '../../components/laboratories/LaboratoryListView';
import LaboratoryDetailSheet from '../../components/laboratories/LaboratoryDetailSheet';
import { useLabLayoutPreference } from '../../hooks/useLabLayoutPreference';

const AdminLabManager = () => {
  const { 
    laboratories, 
    departments, 
    fetchLabs, 
    openConfirm, 
    closeConfirm, 
    setConfirmLoading, 
    showSuccess, 
    showError 
  } = useOutletContext();

  const [isCreateLaboratoryOpen, setIsCreateLaboratoryOpen] = useState(false);
  const [editingLab, setEditingLab] = useState(null);
  const [inspectingLab, setInspectingLab] = useState(null);
  const { isListView, isCardView, setLayout } = useLabLayoutPreference();
  
  // Search and Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('Both');

  // Test Catalog Configuration State
  const [configuringLab, setConfiguringLab] = useState(null);

  const displayMessage = (msg, isError = false) => {
    if (isError) {
      showError(msg);
    } else {
      showSuccess(msg);
    }
  };

  const handleDeleteLaboratory = (id, name) => {
    openConfirm({
      title: 'Delete Laboratory',
      message: `Permanently delete "${name}" laboratory? This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      icon: 'delete_forever',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await api.delete(`/laboratory/config/${id}`);
          showSuccess(`Laboratory "${name}" deleted.`);
          fetchLabs();
          closeConfirm();
        } catch (err) {
          showError(err.response?.data?.message || 'Error deleting laboratory');
          closeConfirm();
        }
      },
    });
  };

  const handleEditLabCatalog = (lab) => {
    setConfiguringLab(lab);
  };

  const handleToggleLabStatus = async (id, name, currentStatus) => {
    try {
      await api.put(`/laboratory/config/${id}`, { isActive: !currentStatus });
      displayMessage(`Laboratory "${name}" ${!currentStatus ? 'activated' : 'deactivated'} successfully.`);
      fetchLabs();
    } catch (err) {
      displayMessage(err.response?.data?.message || 'Error updating status', true);
    }
  };

  const filteredLaboratories = laboratories.filter((lab) => {
    const matchesSearch = searchQuery.trim() === '' ||
      (lab.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lab.departmentId?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lab.departmentId?.code || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'Both' ||
      (lab.departmentId?.type || 'DIAGNOSTIC') === typeFilter;
    return matchesSearch && matchesType;
  });

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    paginatedItems: paginatedLabs,
    showTopPagination,
  } = usePagination(filteredLaboratories, 50, [searchQuery, typeFilter]);

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <section className="info-card" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--md-sys-color-primary)' }}>Hospital Laboratories</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--md-sys-color-on-surface-variant)' }}>
              {filteredLaboratories.length} laborator{filteredLaboratories.length !== 1 ? 'ies' : 'y'} shown
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
            <Md3SearchBar 
              value={searchQuery} 
              onChange={setSearchQuery} 
              placeholder="Search lab or dept code..." 
            />

            {/* View Mode Toggle: Cards vs List */}
            <div className="md3-view-toggle-group" role="group" aria-label="Laboratory directory layout view mode">
              <button
                type="button"
                className={`md3-view-toggle-btn ${isCardView ? 'active' : ''}`}
                onClick={() => setLayout('cards')}
                title="Card Grid View"
                aria-pressed={isCardView}
              >
                <span className="material-symbols-rounded">grid_view</span>
                <span>Cards</span>
              </button>
              <button
                type="button"
                className={`md3-view-toggle-btn ${isListView ? 'active' : ''}`}
                onClick={() => setLayout('list')}
                title="Tabular List View"
                aria-pressed={isListView}
              >
                <span className="material-symbols-rounded">view_list</span>
                <span>List</span>
              </button>
            </div>

            <Md3SegmentedFilter
              selectedValue={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: 'Both', label: 'All' },
                { value: 'DIAGNOSTIC', label: 'Diagnostic' },
                { value: 'CLINICAL/DIAGNOSTIC', label: 'Clin+Diag' },
              ]}
            />
            <button
              onClick={() => setIsCreateLaboratoryOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 20px',
                background: 'var(--md-sys-color-primary, #00668b)',
                color: 'var(--md-sys-color-on-primary, #ffffff)',
                border: 'none',
                borderRadius: '100px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                transition: 'all 200ms ease',
                height: '44px',
                boxShadow: 'var(--md-sys-elevation-1, 0 1px 3px rgba(0,0,0,0.12))'
              }}
              className="lab-add-btn"
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>add</span>
              Add Laboratory
            </button>
          </div>
        </div>

        {/* Top Pagination (rendered when total records exceed 20) */}
        {showTopPagination && (
          <Md3Pagination
            currentPage={page}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="laboratories"
            position="top"
          />
        )}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {paginatedLabs.length === 0 ? (
            <div style={{ width: '100%', padding: '20px 0' }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 24px',
                textAlign: 'center',
                background: 'var(--md-sys-color-surface-container-low, #f7f2fa)',
                borderRadius: '16px',
                border: '1px dashed var(--md-sys-color-outline-variant, #cac4d0)'
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: '48px', color: 'var(--md-sys-color-primary, #00668b)', marginBottom: '12px' }}>
                  science
                </span>
                <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', color: 'var(--md-sys-color-on-surface, #1d1b20)' }}>
                  No laboratories found
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface-variant, #49454f)' }}>
                  There are currently no diagnostic or clinical laboratories configured matching the search criteria or filter.
                </p>
              </div>
            </div>
          ) : isListView ? (
            <div className="md3-paginated-content-fade" key={`list-${page}`} style={{ flex: 1, paddingBottom: '20px' }}>
              <LaboratoryListView
                laboratories={paginatedLabs}
                onInspect={(lab) => setInspectingLab(lab)}
                onEdit={(lab) => setEditingLab(lab)}
                onEditCatalog={(lab) => handleEditLabCatalog(lab)}
                onToggleStatus={(id, name, status) => handleToggleLabStatus(id, name, status)}
                onDelete={(id, name) => handleDeleteLaboratory(id, name)}
              />
            </div>
          ) : (
            <div className="lab-card-grid md3-paginated-content-fade" key={`cards-${page}`} style={{ flex: 1, paddingBottom: '20px' }}>
              {paginatedLabs.map((lab) => (
                <LaboratoryCard
                  key={lab._id}
                  lab={lab}
                  onInspect={(l) => setInspectingLab(l)}
                  onEdit={(l) => setEditingLab(l)}
                  onEditCatalog={(l) => handleEditLabCatalog(l)}
                  onToggleStatus={(id, name, status) => handleToggleLabStatus(id, name, status)}
                  onDelete={(id, name) => handleDeleteLaboratory(id, name)}
                />
              ))}
            </div>
          )}

          {/* Bottom Pagination */}
          {totalItems > 0 && (
            <Md3Pagination
              currentPage={page}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemLabel="laboratories"
              position="bottom"
            />
          )}
        </div>
      </section>

      {/* Slide-Over Laboratory Detail Sheet */}
      <LaboratoryDetailSheet
        lab={inspectingLab}
        isOpen={!!inspectingLab}
        onClose={() => setInspectingLab(null)}
        onEdit={(lab) => { setInspectingLab(null); setEditingLab(lab); }}
        onEditCatalog={(lab) => { setInspectingLab(null); handleEditLabCatalog(lab); }}
        onToggleStatus={(id, name, status) => { setInspectingLab(null); handleToggleLabStatus(id, name, status); }}
      />

      <CreateLaboratorySheet
        isOpen={isCreateLaboratoryOpen || !!editingLab}
        onClose={() => { setIsCreateLaboratoryOpen(false); setEditingLab(null); }}
        onSuccess={(msg) => { displayMessage(msg); fetchLabs(); setIsCreateLaboratoryOpen(false); setEditingLab(null); }}
        departments={departments}
        laboratory={editingLab}
      />

      {configuringLab && (
        <Md3TestCatalogConfigurator
          lab={configuringLab}
          onClose={() => setConfiguringLab(null)}
          onSave={async (updatedCatalog) => {
            await api.put(`/laboratory/config/${configuringLab._id}`, {
              name: configuringLab.name,
              description: configuringLab.description,
              isActive: configuringLab.isActive,
              testCatalog: updatedCatalog
            });
            displayMessage('Laboratory test catalog updated successfully');
            setConfiguringLab(null);
            fetchLabs();
          }}
        />
      )}
    </div>
  );
};

export default AdminLabManager;
