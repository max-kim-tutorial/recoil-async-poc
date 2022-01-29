export type PrecedentType =
    | 'criminal'
    | 'domestic'
    | 'civil'
    | 'administration'
    | 'unclassified';

export interface Tweet {
    id: string;
    name: string;
    content: string;
    uploadedAt: null | Date;
    precedentContent: string[];
    type: PrecedentType;
}

export interface Notification {
    date: string;
    id: number;
    link: string;
    title: string;
}


