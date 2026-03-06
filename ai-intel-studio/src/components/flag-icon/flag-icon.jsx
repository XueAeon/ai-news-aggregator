import { mergeClasses } from 'minimal-shared/utils';

import { styled } from '@mui/material/styles';

import { CONFIG } from 'src/global-config';

import { flagIconClasses } from './classes';

// ----------------------------------------------------------------------

export function FlagIcon({ code, className, sx, ...other }) {
  if (!code) {
    return null;
  }

  const upperCode = code?.toUpperCase();

  return (
    <FlagRoot className={mergeClasses([flagIconClasses.root, className])} sx={sx} {...other}>
      <FlagImg
        loading="lazy"
        alt={upperCode}
        src={`${CONFIG.assetsDir}/assets/flags/${upperCode}.svg`}
        className={flagIconClasses.img}
      />
    </FlagRoot>
  );
}

// ----------------------------------------------------------------------

const FlagRoot = styled('span')(({ theme }) => ({
  width: 26,
  height: 20,
  flexShrink: 0,
  overflow: 'hidden',
  borderRadius: '5px',
  alignItems: 'center',
  display: 'inline-flex',
  justifyContent: 'center',
  backgroundColor: theme.vars.palette.background.neutral,
}));

const FlagImg = styled('img')(() => ({
  width: '100%',
  height: '100%',
  maxWidth: 'unset',
  objectFit: 'cover',
}));
