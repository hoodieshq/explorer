import {
    createNeodymeSecurityTxtWithOptionalFields,
    createPmpSecurityTxt,
} from '@/app/components/account/security/__tests__/helpers';

import { isPmpSecurityTXT } from '../security-txt';

describe('security-txt', () => {
    describe('isPmpSecurityTXT', () => {
        it('should return true for PmpSecurityTXT with logo field', () => {
            const pmpSecurityTxt = createPmpSecurityTxt();

            expect(isPmpSecurityTXT(pmpSecurityTxt)).toBe(true);
        });

        it('should return true for PmpSecurityTXT with version field', () => {
            const pmpSecurityTxt = createPmpSecurityTxt();

            expect(isPmpSecurityTXT(pmpSecurityTxt)).toBe(true);
        });

        it('should return false for NeodymeSecurityTXT with optional fields', () => {
            const neodymeSecurityTxt = createNeodymeSecurityTxtWithOptionalFields();

            expect(isPmpSecurityTXT(neodymeSecurityTxt)).toBe(false);
        });
    });
});
