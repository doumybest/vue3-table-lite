export class TableScroll {
  _target: string;
  _sideScroll: number = 0;
  _scrollInterval: any;

  constructor(_target: string) {
    this._target = _target;

    // 이벤트 핸들러라서 타겟을 가리키므로 클래스의 this에 바인딩 한다
    this.scrollRightSide = this.scrollRightSide.bind(this);
    this.scrollLeftSide = this.scrollLeftSide.bind(this);
  }

  scrollRightSide() {
    const main = document.querySelector(this._target);
    if (main) {
      const { scrollHeight, scrollWidth } = main;
      if (scrollWidth === this._sideScroll) {
        this.stopScroll();
        return;
      }
      const direction = 1;
      const speed = 5;
      const incVal = direction * speed;
      this._sideScroll += incVal;
      main.scroll(this._sideScroll, scrollHeight);
      this._scrollInterval = requestAnimationFrame(this.scrollRightSide);
    }
  }

  // 왼쪽으로 스크롤 이벤트 관리
  scrollLeftSide() {
    const main = document.querySelector(this._target);
    if (main) {
      const { scrollHeight } = main;
      if (0 === this._sideScroll) {
        this.stopScroll();
        return;
      }
      const direction = 1;
      const speed = 5;
      const incVal = direction * speed;
      this._sideScroll -= incVal;
      main.scroll(this._sideScroll, scrollHeight);
      this._scrollInterval = requestAnimationFrame(this.scrollLeftSide);
    }
  }

  stopScroll() {
    cancelAnimationFrame(this._scrollInterval);
  }
}
