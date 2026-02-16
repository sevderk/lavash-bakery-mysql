import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Draft for a single customer row */
export interface DraftOrderRow {
    quantity: number;
    unitPrice: number;
}

interface OrderStoreState {
    /** Map of customerId → draft order row */
    draftOrders: Record<string, DraftOrderRow>;

    /** Set quantity and unit price for a customer */
    setDraft: (customerId: string, quantity: number, unitPrice: number) => void;

    /** Update only the quantity for a customer */
    setQuantity: (customerId: string, quantity: number) => void;

    /** Update only the unit price for a customer */
    setUnitPrice: (customerId: string, unitPrice: number) => void;

    /** Clear all drafts (after successful submission) */
    clearDrafts: () => void;
}

/** Default unit price in TRY */
export const DEFAULT_UNIT_PRICE = 5;

export const useOrderStore = create<OrderStoreState>()(
    persist(
        (set) => ({
            draftOrders: {},

            setDraft: (customerId, quantity, unitPrice) =>
                set((state) => ({
                    draftOrders: {
                        ...state.draftOrders,
                        [customerId]: { quantity, unitPrice },
                    },
                })),

            setQuantity: (customerId, quantity) =>
                set((state) => {
                    const existing = state.draftOrders[customerId];
                    return {
                        draftOrders: {
                            ...state.draftOrders,
                            [customerId]: {
                                quantity,
                                unitPrice: existing?.unitPrice ?? DEFAULT_UNIT_PRICE,
                            },
                        },
                    };
                }),

            setUnitPrice: (customerId, unitPrice) =>
                set((state) => {
                    const existing = state.draftOrders[customerId];
                    return {
                        draftOrders: {
                            ...state.draftOrders,
                            [customerId]: {
                                quantity: existing?.quantity ?? 0,
                                unitPrice,
                            },
                        },
                    };
                }),

            clearDrafts: () => set({ draftOrders: {} }),
        }),
        {
            name: 'lavash-draft-orders',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
