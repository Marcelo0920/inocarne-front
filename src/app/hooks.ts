import { useDispatch, useSelector, useStore } from 'react-redux';
import type { AppDispatch, AppStore, RootState } from './store';

/**
 * Versiones tipadas de los hooks de react-redux.
 * Se usan siempre estas en lugar de las genéricas: así el estado y las
 * acciones quedan tipados sin repetir anotaciones en cada componente.
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppStore = useStore.withTypes<AppStore>();
