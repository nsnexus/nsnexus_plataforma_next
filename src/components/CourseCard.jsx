import React from 'react';
import Link from 'next/link';

export const CourseCard = ({ course }) => {
  const isFlagship = course.id === 'sistemas-sharepoint-moderno';
  const suffix = typeof course.lessonsCount === 'number' ? ' aulas' : '';
  
  const metaHtml = (
    <>
      <span>{course.duration}</span>
      <span>•</span>
      <span>{course.lessonsCount}{suffix}</span>
      <span>•</span>
      <span>{course.level}</span>
    </>
  );

  const isClosed = course.isClosed;
  const priceHtml = isClosed ? (
    <span className="course-card__price">Sob Consulta</span>
  ) : (
    <>
      <span className="course-card__price-original">R$ {course.originalPrice.toFixed(2)}</span>
      <span className="course-card__price">R$ {course.price.toFixed(2)}</span>
    </>
  );

  const btnHtml = isClosed ? (
    <Link href={`/curso/${course.id}`} className="btn btn-sm btn-secondary">Encomendar</Link>
  ) : (
    <Link href={`/curso/${course.id}`} className={`btn btn-sm ${isFlagship ? 'btn-primary' : 'btn-outline'}`}>{isFlagship ? 'Garantir Vaga' : 'Saber Mais'}</Link>
  );

  return (
    <div className={`course-card ${isFlagship ? 'course-card--flagship' : ''}`}>
      <div className="course-card__thumb">
        <img src={course.banner} alt={course.title} />
        <div className="course-card__badge-group">
          <span className={`badge ${course.badgeClass}`}>{course.badgeLabel}</span>
        </div>
      </div>
      <div className="course-card__content">
        <div className="course-card__meta">
          {metaHtml}
        </div>
        <h3 className="course-card__title">{course.title}</h3>
        <p className="course-card__desc">{course.description}</p>
        <div className="course-card__footer">
          <div>
            {priceHtml}
          </div>
          {btnHtml}
        </div>
      </div>
    </div>
  );
};
export default CourseCard;
