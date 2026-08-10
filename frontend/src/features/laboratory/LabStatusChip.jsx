import { Icon, Md3Chip } from '../../components/md3/Md3Widgets';

const STATUS_META = {
  PENDING_SAMPLE: {
    label: 'Awaiting Sample',
    variant: 'secondary',
    icon: <Icon.Beaker />,
  },
  PROCESSING: {
    label: 'In Analysis',
    variant: 'tertiary',
    icon: <Icon.Activity />,
  },
  COMPLETED: {
    label: 'Completed',
    variant: 'success',
    icon: <Icon.Check />,
  },
};

const LabStatusChip = ({ status, size = 'small' }) => {
  const meta = STATUS_META[status] || {
    label: status || 'Unknown',
    variant: 'default',
    icon: <Icon.Alert />,
  };

  return (
    <Md3Chip variant={meta.variant} size={size} icon={meta.icon}>
      {meta.label}
    </Md3Chip>
  );
};

export default LabStatusChip;
