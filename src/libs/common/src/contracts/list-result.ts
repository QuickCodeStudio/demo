import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Paged list result — mirrors C# ListResult<T> / OpenAPI ListResultOfXDto.
 */
export class ListResult<T> {
  @ApiProperty({ isArray: true })
  items!: T[];

  @ApiPropertyOptional({ type: Number, format: 'int32', nullable: true })
  totalCount?: number;
}
