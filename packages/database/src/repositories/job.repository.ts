import { Repository, DataSource, FindManyOptions, ILike, FindOptionsWhere } from 'typeorm';
import { Job } from '../entities/Job.entity';
import { JobStatus, EmploymentType, ExperienceLevel } from '@talent-net/types';

export interface JobSearchParams {
  status?: JobStatus;
  department?: string;
  level?: ExperienceLevel;
  employmentType?: EmploymentType;
  isRemote?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export class JobRepository extends Repository<Job> {
  constructor(dataSource: DataSource) {
    super(Job, dataSource.createEntityManager());
  }

  async findWithFilters(params: JobSearchParams): Promise<[Job[], number]> {
    const {
      status,
      department,
      level,
      employmentType,
      isRemote,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = params;

    const where: FindOptionsWhere<Job>[] = [];

    const baseWhere: FindOptionsWhere<Job> = {};
    if (status) baseWhere.status = status;
    if (department) baseWhere.department = department;
    if (level) baseWhere.level = level;
    if (employmentType) baseWhere.employmentType = employmentType;
    if (isRemote !== undefined) baseWhere.isRemote = isRemote;

    if (search) {
      where.push({ ...baseWhere, title: ILike(`%${search}%`) });
      where.push({ ...baseWhere, department: ILike(`%${search}%`) });
    } else {
      where.push(baseWhere);
    }

    const options: FindManyOptions<Job> = {
      where: where.length > 0 ? where : undefined,
      order: { [sortBy]: sortOrder } as FindManyOptions<Job>['order'],
      skip: (page - 1) * limit,
      take: limit,
      relations: ['createdBy', 'scoringConfig'],
    };

    return this.findAndCount(options);
  }

  async findPublishedForPortal(params: {
    department?: string;
    level?: ExperienceLevel;
    employmentType?: EmploymentType;
    isRemote?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<[Job[], number]> {
    return this.findWithFilters({ ...params, status: JobStatus.PUBLISHED });
  }

  async findBySlug(slug: string): Promise<Job | null> {
    return this.findOne({
      where: { slug },
      relations: ['scoringConfig', 'applicationForm', 'applicationForm.screeningQuestions'],
    });
  }

  async findWithFullDetail(id: string): Promise<Job | null> {
    return this.findOne({
      where: { id },
      relations: [
        'createdBy',
        'scoringConfig',
        'scoringConfig.evaluationDimensions',
        'scoringConfig.knockoutRules',
        'applicationForm',
        'applicationForm.screeningQuestions',
        'assignments',
        'assignments.user',
      ],
    });
  }

  async generateUniqueSlug(title: string): Promise<string> {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80);

    let slug = base;
    let suffix = 1;

    while (await this.findOne({ where: { slug } })) {
      slug = `${base}-${suffix}`;
      suffix++;
    }

    return slug;
  }

  async countApplicationsByJob(jobId: string): Promise<number> {
    const result = await this.createQueryBuilder('job')
      .leftJoin('job.applications', 'application')
      .where('job.id = :jobId', { jobId })
      .select('COUNT(application.id)', 'count')
      .getRawOne<{ count: string }>();
    return parseInt(result?.count ?? '0', 10);
  }
}
