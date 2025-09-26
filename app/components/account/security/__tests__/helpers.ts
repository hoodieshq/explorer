import { PublicKey } from "@solana/web3.js";

import { SecurityTXT } from "@/app/utils/security-txt";

export const programDataWithoutSecurityTxt = {
    authority: new PublicKey('11111111111111111111111111111111'),
    data: ['deadbeef', 'base64'] as [string, 'base64'],
    slot: 123,
};

export const programDataWithSecurityTxt = {
    authority: new PublicKey('11111111111111111111111111111111'),
    data: [encodeSecurityTxt({ contacts: 'email:mail@mail.mail', name: 'NeodymeSecurityTXT', policy: 'policy', project_url: 'https://github.com' }), 'base64'] as [string, 'base64'],
    slot: 123,
};

export function encodeSecurityTxt(data: Pick<SecurityTXT, "name" | "project_url" | "contacts" | "policy">): string {
    const HEADER = "=======BEGIN SECURITY.TXT V1=======\0";
    const FOOTER = "=======END SECURITY.TXT V1=======\0";

    // build key-value pairs separated by \0
    const parts: string[] = [];
    for (const [k, v] of Object.entries(data)) {
        parts.push(k, v);
    }

    const content = parts.join("\0") + "\0";
    return Buffer.from(HEADER + content + FOOTER, "utf8").toString("base64");
}