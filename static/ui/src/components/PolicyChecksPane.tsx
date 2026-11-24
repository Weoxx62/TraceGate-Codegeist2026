import React from 'react';
import type {
  EvaluationResult,
  PolicyFinding,
  PolicyRuleCode,
} from '../../../../src/core/index';
import { CheckIcon, CrossIcon } from './Icons';

interface ControlSpec {
  code: PolicyRuleCode;
  name: string;
  passLine: string;
}

const CONTROLS: ControlSpec[] = [
  {
    code: 'HASH_DRIFT_CHECK',
    name: 'Specification integrity',
    passLine: 'All source specifications match QA-signed SHA-256 baselines.',
  },
  {
    code: 'SUSPECT_LINK_PROPAGATION',
    name: 'Downstream verification',
    passLine: 'All linked requirements, hazards, and tests remain valid.',
  },
  {
    code: 'TRACEABILITY_COMPLETENESS',
    name: 'Hazard mitigation',
    passLine: 'Critical FMEA risks link to non-suspect verification tests.',
  },
  {
    code: 'TEMPORAL_FRESHNESS',
    name: 'Evidence freshness',
    passLine: 'All test executions post-date latest specification edits.',
  },
  {
    code: 'SEGREGATION_OF_DUTIES',
    name: 'Segregation of duties',
    passLine: 'Independent QA reviewer separated from spec modifier.',
  },
];

interface PolicyChecksPaneProps {
  evaluation: EvaluationResult;
  selectedNodeId: string;
  busy: boolean;
  onSelectNode: (nodeId: string) => void;
  onCreateRemediation: () => void;
}

export const PolicyChecksPane: React.FC<PolicyChecksPaneProps> = ({
  evaluation,
  selectedNodeId,
  busy,
  onSelectNode,
  onCreateRemediation,
}) => {
  const allFindings: PolicyFinding[] = [
    ...evaluation.blockers,
    ...evaluation.warnings,
  ];

  return (
    <section className="tg-card" aria-label="Required Controls">
      <div className="tg-card-head">
        <div>
          <span className="tg-card-title">Required controls</span>
          <span className="tg-card-sub" style={{ marginLeft: 8 }}>
            {evaluation.blockers.length === 0
              ? 'All 5 checks passing'
              : `${evaluation.blockers.length} blocking check${evaluation.blockers.length === 1 ? '' : 's'}`}
          </span>
        </div>

        {evaluation.blockers.length > 0 && (
          <button
            type="button"
            className="tg-btn tg-btn-sm"
            disabled={busy}
            onClick={onCreateRemediation}
          >
            Create Jira tasks
          </button>
        )}
      </div>

      <div>
        {CONTROLS.map((ctrl) => {
          const matches = allFindings.filter((f) => f.code === ctrl.code);
          const passed = matches.length === 0;
          const uniqueNodes = Array.from(
            new Map(matches.map((m) => [m.nodeId, m.externalId])).entries(),
          );

          return (
            <div key={ctrl.code} className="tg-check-row">
              <div className="tg-check-left">
                <span
                  style={{
                    color: passed ? 'var(--emerald)' : 'var(--coral)',
                    display: 'inline-flex',
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  {passed ? <CheckIcon size={14} /> : <CrossIcon size={14} />}
                </span>
                <span className="tg-check-name">{ctrl.name}</span>
                <span className="tg-check-detail">
                  {passed ? ctrl.passLine : matches[0].message}
                </span>
              </div>

              <div className="tg-check-chips">
                {uniqueNodes.slice(0, 3).map(([nodeId, externalId]) => (
                  <button
                    key={nodeId}
                    type="button"
                    className={`tg-chip ${selectedNodeId === nodeId ? 'tg-chip-active' : ''}`}
                    onClick={() => onSelectNode(nodeId)}
                  >
                    {externalId}
                  </button>
                ))}
                <span
                  className={`tg-pill ${passed ? 'tg-pill-emerald' : 'tg-pill-coral'}`}
                >
                  {passed ? 'Pass' : `${matches.length} issue${matches.length === 1 ? '' : 's'}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
