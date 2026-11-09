import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Batch } from '../constants/timetable';

// current time (refreshed every 30 s) and the batch chosen in the timetable
export function useNow() {
  const [batch, setBatch] = useState<Batch>('A');
  const [now, setNow] = useState(new Date());
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('batch_v1').then((b) => { if (b === 'A' || b === 'B') setBatch(b); }).catch(() => {});
      setNow(new Date());
      const id = setInterval(() => setNow(new Date()), 30000);
      return () => clearInterval(id);
    }, [])
  );
  return { batch, now };
}
