declare type TagOptions = {
    sourceImage: string;
    targetImage: string;
};
declare const tag: (options: TagOptions) => Promise<void>;
declare type PushOptions = {
    image: string;
};
declare const push: (options: PushOptions) => Promise<void>;
export { tag, push };
