import { Repository, DataSource } from 'typeorm';
import { ScoringConfig } from '../entities/ScoringConfig.entity';
import { EvaluationDimension } from '../entities/EvaluationDimension.entity';
import { KnockoutRule } from '../entities/KnockoutRule.entity';

export class ScoringConfigRepository extends Repository<ScoringConfig> {
  constructor(dataSource: DataSource) {
    super(ScoringConfig, dataSource.createEntityManager());
  }

  async findByJobId(jobId: string): Promise<ScoringConfig | null> {
    return this.findOne({
      where: { jobId },
      relations: ['evaluationDimensions', 'knockoutRules'],
      order: {
        evaluationDimensions: { order: 'ASC' },
      },
    });
  }

  async findTemplates(): Promise<ScoringConfig[]> {
    return this.find({
      where: { isTemplate: true },
      relations: ['evaluationDimensions', 'knockoutRules'],
    });
  }

  async cloneFromTemplate(templateId: string, targetJobId: string): Promise<ScoringConfig> {
    const template = await this.findOne({
      where: { id: templateId },
      relations: ['evaluationDimensions', 'knockoutRules'],
    });

    if (!template) {
      throw new Error(`Scoring template ${templateId} not found`);
    }

    const clone = this.create({
      jobId: targetJobId,
      totalScaleMax: template.totalScaleMax,
      preInterviewWeight: template.preInterviewWeight,
      postInterviewWeight: template.postInterviewWeight,
      shortlistThreshold: template.shortlistThreshold,
      passThreshold: template.passThreshold,
      manualReviewThreshold: template.manualReviewThreshold,
      isTemplate: false,
    });

    clone.evaluationDimensions = template.evaluationDimensions.map((d) => {
      const dimension = new EvaluationDimension();
      dimension.name = d.name;
      dimension.description = d.description;
      dimension.weight = d.weight;
      dimension.type = d.type;
      dimension.phase = d.phase;
      dimension.minimumThreshold = d.minimumThreshold;
      dimension.isVisibleToAllReviewers = d.isVisibleToAllReviewers;
      dimension.order = d.order;
      return dimension;
    });

    clone.knockoutRules = template.knockoutRules.map((r) => {
      const rule = new KnockoutRule();
      rule.name = r.name;
      rule.description = r.description;
      rule.condition = r.condition;
      rule.conditionValue = r.conditionValue;
      rule.action = r.action;
      rule.errorMessage = r.errorMessage;
      rule.isActive = r.isActive;
      return rule;
    });

    return this.save(clone);
  }

  async validateWeights(scoringConfigId: string): Promise<{
    isValid: boolean;
    totalWeight: number;
    errors: string[];
  }> {
    const config = await this.findOne({
      where: { id: scoringConfigId },
      relations: ['evaluationDimensions'],
    });

    if (!config) {
      return { isValid: false, totalWeight: 0, errors: ['Scoring config not found'] };
    }

    const errors: string[] = [];
    const totalWeight = config.evaluationDimensions.reduce((sum, d) => sum + Number(d.weight), 0);

    if (Math.abs(totalWeight - 100) > 0.01) {
      errors.push(`Total dimension weight is ${totalWeight.toFixed(2)}% - must equal 100%`);
    }

    const phaseTotal = { pre_interview: 0, post_interview: 0, both: 0 };
    for (const d of config.evaluationDimensions) {
      phaseTotal[d.phase] = (phaseTotal[d.phase] ?? 0) + Number(d.weight);
    }

    const preWeight = Number(config.preInterviewWeight);
    const postWeight = Number(config.postInterviewWeight);

    if (Math.abs(preWeight + postWeight - 100) > 0.01) {
      errors.push(
        `preInterviewWeight (${preWeight}) + postInterviewWeight (${postWeight}) must equal 100`
      );
    }

    for (const d of config.evaluationDimensions) {
      if (Number(d.weight) < 0 || Number(d.weight) > 100) {
        errors.push(`Dimension "${d.name}" has invalid weight ${d.weight}`);
      }
    }

    return { isValid: errors.length === 0, totalWeight, errors };
  }
}
