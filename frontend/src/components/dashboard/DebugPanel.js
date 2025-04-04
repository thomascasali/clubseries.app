import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Button
} from '@mui/material';
import moment from 'moment';

const DebugPanel = ({ 
  debugInfo, 
  showOnlySubscribed, 
  subscribedTeams,
  testDirectApi,
  loadAllMatches
}) => {
  return (
    <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
      <Typography variant="h6">Debug Info</Typography>
      <Box 
        component="pre" 
        sx={{ 
          mt: 1, 
          p: 1, 
          bgcolor: '#333', 
          color: '#fff', 
          borderRadius: 1,
          fontSize: '0.85rem',
          overflow: 'auto' 
        }}
      >
        {JSON.stringify({
          ...debugInfo,
          filtersActive: {
            showOnlySubscribed,
            hasSubscriptions: subscribedTeams.length > 0
          },
          currentTime: moment().format('HH:mm:ss'),
          twoHoursAgo: moment().subtract(2, 'hours').format('HH:mm:ss')
        }, null, 2)}
      </Box>
      <Box mt={2} display="flex" justifyContent="space-between">
        <Button 
          variant="contained" 
          color="secondary" 
          onClick={testDirectApi}
          size="small"
        >
          Test API
        </Button>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={loadAllMatches}
          size="small"
        >
          Ricarica Partite
        </Button>
      </Box>
    </Paper>
  );
};

export default DebugPanel;
