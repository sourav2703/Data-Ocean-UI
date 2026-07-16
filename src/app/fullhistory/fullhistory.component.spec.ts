import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FullhistoryComponent } from './fullhistory.component';

describe('FullhistoryComponent', () => {
  let component: FullhistoryComponent;
  let fixture: ComponentFixture<FullhistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FullhistoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FullhistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
