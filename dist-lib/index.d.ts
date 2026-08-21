export declare function buildRunnerConfig(identifier: string, content: QtiContentMetadata): Promise<RunnerConfig>;

export declare interface ConfigSection {
    identifier: string;
    name: string;
    blurb?: string;
    itemIdentifiers: string[];
    timeLimitSeconds?: number;
    allowLateSubmission?: boolean;
}

export declare interface FlattenedSection {
    identifier: string | null;
    name: string | null;
    blurb: string;
    itemIdentifiers: (string | null)[];
    timeLimitSeconds: number | null;
    allowLateSubmission: boolean;
}

/**
 * Flatten a parsed test's item refs into one ordered list — document order
 * is the navigable step order (currentItem/Next/Previous).
 */
export declare function flattenItemRefs(parsedTest: ParsedTest): ItemRef[];

/**
 * Flatten a parsed test's sections into TestRunner's config.sections shape —
 * multiple test-parts flatten into one list.
 */
export declare function flattenSections(parsedTest: ParsedTest): FlattenedSection[];

export declare interface ItemRef {
    identifier: string | null;
    href: string | null;
    timeLimits: TimeLimits | null;
}

/**
 * Per-item sessionControl override — camelCase, and a DIFFERENT shape than
 * the top-level (snake_case) SessionControl config: only these three fields
 * are ever overridden per-item.
 */
declare interface ItemSessionControlOverride {
    validateResponses?: boolean;
    showFeedback?: boolean;
    submissionMode?: string;
}

/** Parse a qti-assessment-test into its part/section tree, in document order. */
export declare function parseAssessmentTest(xmlText: string): ParsedTest;

declare interface ParsedSection {
    identifier: string | null;
    title: string | null;
    itemRefs: ItemRef[];
    rubricBlockText: string;
    timeLimits: TimeLimits | null;
}

export declare interface ParsedTest {
    title: string;
    parts: ParsedTestPart[];
    timeLimits: TimeLimits | null;
}

declare interface ParsedTestPart {
    identifier: string | null;
    submissionMode: string;
    sections: ParsedSection[];
    timeLimits: TimeLimits | null;
    maxAttempts: number | null;
}

/** Parses an ISO 8601 time-only duration (e.g. "PT45M", "PT1H30M", "PT90S") into seconds. */
export declare function parseIso8601Duration(value: string): number | null;

export declare interface QtiContentMetadata {
    name?: string;
    previewUrl?: string;
    stimulusList?: {
        identifier: string;
        href: string;
    }[];
    itemList?: {
        identifier: string;
        href?: string;
        stimulusRefs?: string[];
    }[];
    testList?: {
        href: string;
    }[];
    timeLimits?: {
        min?: number;
        max?: number;
    };
    maxAttempts?: number;
}

/**
 * The single prop this app takes: everything about one test run. Items
 * carry either xml (used as-is) or href (fetched via ContentLoader).
 * context is the Sunbird TelemetryContext (uid, sid, channel, pdata, host,
 * etc.) — empty/omitted skips telemetry entirely.
 */
export declare interface RunnerConfig {
    title?: string;
    items: TestItem[];
    sections?: ConfigSection[];
    submissionMode?: string;
    sessionControl?: Partial<SessionControl>;
    previewUrl?: string;
    stimulusList?: StimulusDescriptor[];
    showSectionIntro?: boolean;
    showAssessmentIntro?: boolean;
    timeLimitSeconds?: number;
    context?: Record<string, unknown>;
}

export declare interface Section {
    identifier: string;
    name: string | null;
    blurb?: string;
    itemIdentifiers?: (string | null)[];
    answered?: number;
    total?: number;
    timeLimitSeconds?: number | null;
    allowLateSubmission?: boolean;
}

declare interface SessionControl {
    allow_comment: boolean;
    allow_review: boolean;
    allow_skipping: boolean;
    max_attempts: number;
    show_feedback: boolean;
    show_solution: boolean;
    time_limits: {
        min_time: number | null;
        max_time: number | null;
        allow_late_submission: boolean;
    };
    validate_responses: boolean;
}

export declare interface StimulusDescriptor {
    identifier: string;
    href: string;
}

export declare interface TestItem {
    identifier: string;
    guid: string;
    xml?: string;
    href?: string;
    stimulusRefs?: string[];
    sessionControl?: ItemSessionControlOverride;
    interactionType?: string;
}

export declare interface TimeLimits {
    /** Seconds, parsed from the ISO 8601 duration in max-time (e.g. "PT45M"). Null if absent/unparseable. */
    maxSeconds: number | null;
    allowLateSubmission: boolean;
}

export { }
