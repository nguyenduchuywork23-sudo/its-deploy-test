import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  jiraProjectKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  jiraBaseUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  githubRepos?: string[];

  @IsOptional()
  @IsString()
  mentorId?: string;
}