<script lang="ts">
import ColumnResizer from "column-resizer/src/ColumnResizer.js";
import * as DOMPurify from "dompurify";
import { TableScroll } from "../tableScroll";
import { isEqual } from "lodash-es";
import { onUnmounted, nextTick } from "vue";
import {
  defineComponent,
  ref,
  reactive,
  computed,
  watch,
  onBeforeUpdate,
  onMounted,
  Ref,
} from "vue";

interface pageOption {
  value: number;
  text: number | string;
}

interface tableSetting {
  isSlotMode: boolean;
  isCheckAll: boolean;
  isIndeterminate: boolean;
  isHidePaging: boolean;
  keyColumn: string;
  page: number;
  pageSize: number;
  maxPage: number;
  offset: number;
  limit: number;
  paging: Array<number>;
  order: string;
  sort: string;
  pageOptions: Array<pageOption>;
  isVerticalHighlight: boolean;
}

interface column {
  isKey: string;
  field: string;
}

export default defineComponent({
  name: "my-table",
  emits: {
    // eslint-disable-next-line
    "return-checked-rows": (_rowModel: any[]) => true,
    // eslint-disable-next-line
    "do-search": (
      _offset: number,
      _limit: number,
      _order: string,
      _sort: string,
      _page: number
    ) => true,
    // eslint-disable-next-line
    "is-finished": (_elements: HTMLCollectionOf<Element>) => true,
    // eslint-disable-next-line
    "get-now-page": (_pageNo: number) => true,
    // eslint-disable-next-line
    "row-clicked": (_row: any, _event: any) => true,
    // eslint-disable-next-line
    "row-toggled": (_rows: any[], _isCollapsed: boolean) => true,
    "on-filter": (_keyword: string) => true,
    "width-update": (_columns: any) => true,
  },
  props: {
    multiple: {
      type: Boolean,
      default: true,
    },
    resizeOptions: {
      type: Object,
      default: () => {},
    },
    id: {
      type: String,
      required: true,
    },
    scrollId: {
      type: String,
    },
    scrollUse: {
      type: Boolean,
      default: false,
    },
    // 是否讀取中 (is data loading)
    isLoading: {
      type: Boolean,
      require: true,
    },
    // 是否執行了重新查詢 (Whether to perform a re-query)
    isReSearch: {
      type: Boolean,
      require: true,
    },
    // 有無Checkbox (Presence of Checkbox)
    hasCheckbox: {
      type: Boolean,
      default: false,
    },
    // Checkbox勾選後返回資料的型態 (Returns data type for checked of Checkbox)
    checkedReturnType: {
      type: String,
      default: "row",
    },
    // 標題 (title)
    title: {
      type: String,
      default: "",
    },
    // 是否鎖定第一欄位位置 (Fixed first column's position)
    isFixedFirstColumn: {
      type: Boolean,
      default: false,
    },
    // 欄位 (Field)
    columns: {
      type: Array,
      default: () => {
        return [];
      },
    },
    // 資料 (data)
    rows: {
      type: Array,
      default: () => {
        return [];
      },
    },
    // 資料列類別 (data row classes)
    rowClasses: {
      type: [Array, Function],
      default: () => {
        return [];
      },
    },
    // 一頁顯示筆數 (Display the number of items on one page)
    pageSize: {
      type: Number,
      default: 10,
    },
    // 總筆數 (Total number of transactions)
    total: {
      type: Number,
      default: 100,
    },
    // 現在頁數 (Current page number)
    page: {
      type: Number,
      default: 1,
    },
    // 排序條件 (Sort condition)
    sortable: {
      type: Object,
      default: () => {
        return {
          order: "id",
          sort: "asc",
        };
      },
    },
    // 顯示文字 (Display text)
    messages: {
      type: Object,
      default: () => {
        return {
          pagingInfo: "{2} 중 {0}-{1} 표시",
          pageSizeChangeLabel: "행갯수:",
          gotoPageLabel: "이동:",
          noDataAvailable: "데이터가 없습니다",
        };
      },
    },
    // 靜態模式 (Static mode(no refresh server data))
    isStaticMode: {
      type: Boolean,
      default: false,
    },
    // 插槽模式 (V-slot mode)
    isSlotMode: {
      type: Boolean,
      default: true,
    },
    // 是否隱藏換頁資訊 (Hide paging)
    isHidePaging: {
      type: Boolean,
      default: false,
    },
    // 一頁顯示筆數下拉選單 (Dropdown of Display the number of items on one page)
    pageOptions: {
      type: Array,
      default: () => [
        {
          value: 5,
          text: 5,
        },
        {
          value: 10,
          text: 10,
        },
        {
          value: 25,
          text: 25,
        },
        {
          value: 50,
          text: 50,
        },
        {
          value: 100,
          text: 100,
        },
      ],
    },
    // 分類條件 (Key of grouping)
    groupingKey: {
      type: String,
      default: "",
    },
    // 是否顯示隱藏分類開關 (Has hide group rows toggle)
    hasGroupToggle: {
      type: Boolean,
      default: false,
    },
    // 客製化分類顯示 (Customize grouping title)
    groupingDisplay: {
      type: Function,
      default: null,
    },
    minHeight: {
      default: "auto",
    },
    // 設定表格高度 (Table's max height)
    maxHeight: {
      default: "auto",
    },
    // 預設群組顯示時為折疊 (Grouping collapsed on start)
    startCollapsed: {
      type: Boolean,
      default: false,
    },
    // 保持刷新後折疊狀態 (Keep collapsed status after refresh)
    isKeepCollapsed: {
      type: Boolean,
      default: false,
    },
    // 選擇行是否高亮（Vertical highlight switch）
    isVerticalHighlight: {
      type: Boolean,
      default: false,
    },
    checkboxWrapperClass: {
      type: String,
      default: "form-check form-check-info",
    },
    selectedItems: {
      type: Array,
    },
  },
  setup(props, { emit, slots }) {
    const resizer = ref();
    const resizerOptions = ref();
    const emptyHeight = ref();
    let localTable = ref<HTMLElement | null>(null);
    const tableHeader = ref<HTMLElement | null>(null);
    const rootTable = ref<HTMLElement | null>(null);

    const enterRow: any = ref(null);

    ////////////////////////////////

    ////////////////////////////////

    const getColumnLength = () => {
      if (props.hasCheckbox) return props.columns?.length + 1;
      else return props.columns?.length;
    };

    const onRowClicked = (event: any, row: any) => {
      // 기존에 선택된 행 해제
      const root = document.querySelector(`#${props.id}-root`);
      if (root) {
        const dom = root.querySelectorAll(".row-clicked");
        if (dom) {
          for (let i = 0; i < dom.length; i++) {
            dom[i].classList?.remove("row-clicked");
          }
        }
      }

      enterRow.value?.classList?.add("row-clicked");
      emit("row-clicked", row, event);
      return;
    };

    const scrollHandler = ref(
      new TableScroll(
        `#${props.scrollId} > .vtl-card-body > .vtl-row > .col-sm-12 > .vtl-table`
      )
    );

    // 검색
    const closeFilterLayer = (evt: any) => {
      const id = document.querySelector("#filterRef");
      if (!id) return;

      const filterTargets = ["filter-close-icon", "filter-close", "filter-icon"];
      if (
        !filterTargets.includes(evt.target.getAttribute("name")) &&
        !id.contains(evt.target)
      ) {
        props.columns.forEach((col: any) => {
          closeLayer(col);
        });
      }
    };

    const resizeEvent = () => {
      const root = document.querySelector(`#${props.id}-root`);
      if (root) {
        // const { width } = root?.getBoundingClientRect() || null;
        // console.log(width)
        // localTable.value?.setAttribute("style", `width: ${width}px !important`);
        resizer.value.reset(resizerOptions.value);
      }
    };

    const closeLayer = (col: any) => {
      col.showFilter = false;
    };

    const openLayer = (evt: any, col: any) => {
      evt.stopPropagation();
      col.showFilter = true;
    };

    const searchFilter = (col: any) => {
      emit("on-filter", {
        keyword: col.keyword,
        columnData: col,
      });
    };
    //

    // 檢查下拉選單中是否包含預設一頁顯示筆數 (Validate dropdown's values have page-size value or not)
    let tmpPageOptions = props.pageOptions as Array<pageOption>;
    let defaultPageSize =
      props.pageOptions.length > 0 ? ref(tmpPageOptions[0].value) : ref(props.pageSize);
    if (tmpPageOptions.length > 0) {
      tmpPageOptions.forEach((v: pageOption) => {
        if (
          Object.prototype.hasOwnProperty.call(v, "value") &&
          Object.prototype.hasOwnProperty.call(v, "text") &&
          props.pageSize == v.value
        ) {
          defaultPageSize.value = v.value;
        }
      });
    }

    // 組件用內部設定值 (Internal set value for components)
    const setting: tableSetting = reactive({
      // 是否啟用Slot模式 (Enable slot mode)
      isSlotMode: props.isSlotMode,
      // 是否全選 (Whether to select all)
      isCheckAll: false,
      // 是否讓全選框呈現半選狀態 (checkbox indeterminate state)
      isIndeterminate: false,
      // 是否隱藏換頁資訊 (Hide paging)
      isHidePaging: props.isHidePaging,
      // KEY欄位名稱 (KEY field name)
      keyColumn: computed(() => {
        let key = "";
        Object.assign(props.columns).forEach((col: column) => {
          if (col.isKey) {
            key = col.field;
          }
        });
        return key;
      }),
      // 當前頁數 (current page number)
      page: props.page,
      // 每頁顯示筆數 (Display count per page)
      pageSize: defaultPageSize.value,
      // 最大頁數 (Maximum number of pages)
      maxPage: computed(() => {
        if (props.total <= 0) {
          return 0;
        }
        let maxPage = Math.floor(props.total / setting.pageSize);
        let mod = props.total % setting.pageSize;
        if (mod > 0) {
          maxPage++;
        }
        return maxPage;
      }),
      // 該頁數起始值 (The starting value of the page number)
      offset: computed(() => {
        return (setting.page - 1) * setting.pageSize + 1;
      }),
      // 該頁數最大值 (Maximum number of pages0
      limit: computed(() => {
        let limit = setting.page * setting.pageSize;
        return props.total >= limit ? limit : props.total;
      }),
      // 換頁陣列 (Paging array)
      paging: computed(() => {
        let startPage = setting.page - 2 <= 0 ? 1 : setting.page - 2;
        if (setting.maxPage - setting.page <= 2) {
          startPage = setting.maxPage - 4;
        }
        startPage = startPage <= 0 ? 1 : startPage;
        let pages = [];
        for (let i = startPage; i <= setting.maxPage; i++) {
          if (pages.length < 5) {
            pages.push(i);
          }
        }
        return pages;
      }),
      // 組件內用排序 (Sortable for local)
      order: props.sortable.order,
      sort: props.sortable.sort,
      pageOptions: computed(() => {
        const ops: pageOption[] = [];
        props.pageOptions?.forEach((o) => {
          ops.push({
            value: (o as pageOption).value,
            text: (o as pageOption).text,
          });
        });
        return ops;
      }),
      isVerticalHighlight: props.isVerticalHighlight,
    });

    // 已選擇中的資料 (Checked rows)
    const checkModel = ref<Array<any>>([]);

    // 組件內用資料 (Data rows for local)
    const localRows = computed(() => {
      // sort rows
      let rows = props.rows as Array<any>;
      // refs https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Collator/compare
      var collator = new Intl.Collator(undefined, {
        numeric: true,
        sensitivity: "base",
      });
      let sortOrder = setting.sort === "desc" ? -1 : 1;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rows.sort((a: any, b: any): number => {
        return collator.compare(a[setting.order], b[setting.order]) * sortOrder;
      });

      let result = null;
      if (props.groupingKey) {
        // If have set grouping-key create group temp data
        let tmp = {} as any;
        rows.forEach((v: any) => {
          if (!tmp[v[props.groupingKey]]) {
            tmp[v[props.groupingKey]] = [];
          }
          tmp[v[props.groupingKey]].push(v);
        });

        result = {} as any;
        for (let index = setting.offset - 1; index < setting.limit; index++) {
          result[rows[index][props.groupingKey]] = tmp[rows[index][props.groupingKey]];
        }
      } else {
        result = [];
        for (let index = setting.offset - 1; index < setting.limit; index++) {
          result.push(rows[index]);
        }
      }

      nextTick(function () {
        // 資料完成渲染後回傳私有元件
        callIsFinished();
      });

      return result;
    });

    ////////////////////////////
    //
    //  Checkbox 相關操作
    //  (Checkbox related operations)
    //

    // 定義Checkbox參照 (Define Checkbox reference)
    const rowCheckbox = ref([]);

    /**
     * 重新渲染前執行 (Execute before re-rendering)
     */
    onBeforeUpdate(() => {
      // 每次更新前都把值全部清空 (Clear all values before each update)
      rowCheckbox.value = [];
    });

    /**
     * 監聽全勾選Checkbox (Check all checkboxes for monitoring)
     */
    const stopWatch1 = watch(
      () => setting.isCheckAll,
      (state: boolean) => {
        if (props.hasCheckbox) {
          setting.isIndeterminate = false;
          checkModel.value = [];
          if (state) {
            let tmpRows = props.isStaticMode
              ? props.rows.slice(setting.offset - 1, setting.limit)
              : props.rows;
            if (props.checkedReturnType == "row") {
              checkModel.value = tmpRows
                .map((val: any) => {
                  if (!val.disabled) return val;
                  else return null;
                })
                .filter((item: any) => item);
            } else {
              checkModel.value = tmpRows
                .map((val: any) => {
                  if (!val.disabled) return val;
                  else return null;
                })
                .filter((item: any) => item);
            }
          }
          rowCheckbox.value.forEach((val: HTMLInputElement) => {
            if (val && !val.disabled) {
              val.checked = state;
            }
          });
          // 回傳畫面上選上的資料 (Return the selected data on the screen)
          emit("return-checked-rows", checkModel.value);
        }
      }
    );

    /**
     * 監控有無顯示Checkbox變化 (hasCeckbox props for monitoring)
     */
    const stopWatch2 = watch(
      () => props.hasCheckbox,
      (v) => {
        if (!v) {
          setting.isCheckAll = false;
        }
      }
    );

    const checkDup = (data: any) => {
      for (let i = 0; i < checkModel.value.length; i++) {
        const item = checkModel.value[i];
        const check = isEqual(item, data);
        if (check) return check;
      }
      return false;
    };

    const getCheckedIndex = (data: any) => {
      for (let i = 0; i < checkModel.value.length; i++) {
        const item = checkModel.value[i];
        const check = isEqual(item, data);
        if (check) {
          return i;
        }
      }

      return -1;
    };

    /**
     * Checkbox點擊事件 (Checkbox click event)
     */
    const checked = (row: any, event: MouseEvent): void => {
      event.stopPropagation();

      setting.isIndeterminate = false;
      let checkboxValue = row[setting.keyColumn];
      if (props.checkedReturnType == "row") {
        checkboxValue = row;
      }

      // 체크!
      if ((event.target as HTMLInputElement).checked) {
        if (props.multiple) {
          if (!checkDup(checkboxValue)) checkModel.value.push(checkboxValue);
        } else {
          checkModel.value = null;
          checkModel.value = [checkboxValue];
        }
      } else {
        // 체크 해제!
        const index = getCheckedIndex(checkboxValue);
        if (index >= 0) {
          checkModel.value.splice(index, 1);
        }

        // 전체 체크박스 상태 변경
        if (checkModel.value.length === 0) clearChecked();
      }

      // 전체선택 버튼 처리
      if (checkModel.value.length == props.rows.length) {
        if (setting.isCheckAll) {
          emit("return-checked-rows", checkModel.value);
        }
        setting.isCheckAll = true;
      } else {
        if (checkModel.value.length > 0) {
          setting.isIndeterminate = true;
        }
        // 回傳畫面上選上的資料 (Return the selected data on the screen)
        emit("return-checked-rows", checkModel.value);
      }
    };

    /**
     * 清空畫面上所有選擇資料 (Clear all selected data on the screen)
     */
    const clearChecked = (callback: boolean = true) => {
      setting.isCheckAll = false;
      setting.isIndeterminate = false;
      checkModel.value = [];
      rowCheckbox.value.forEach((val: HTMLInputElement) => {
        if (val && val.checked) {
          val.checked = false;
        }
      });
      // 回傳畫面上選上的資料 (Return the selected data on the screen)
      if (callback) emit("return-checked-rows", checkModel.value);
    };

    ////////////////////////////
    //
    //  排序·換頁等 相關操作
    //  (Sorting, page change, etc. related operations)
    //

    /**
     * 呼叫執行排序 (Call execution sequencing)
     */
    const doSort = (order: string) => {
      let sort = "asc";
      if (order == setting.order) {
        // 排序中的項目時 (When sorting items)
        if (setting.sort == "asc") {
          sort = "desc";
        }
      }
      let offset = (setting.page - 1) * setting.pageSize;
      let limit = setting.pageSize;
      setting.order = order;
      setting.sort = sort;
      emit("do-search", offset, limit, order, sort, setting.page);

      // 清空畫面上選擇的資料 (Clear the selected data on the screen)
      if (setting.isCheckAll) {
        // 取消全選時自然會清空 (It will be cleared when you cancel all selections)
        setting.isCheckAll = false;
      } else {
        if (props.hasCheckbox) {
          clearChecked();
        }
      }
    };

    /**
     * 切換頁碼 (Switch page number)
     *
     * @param page      number  新頁碼    (New page number)
     * @param prevPage  number  現在頁碼  (Current page number)
     */
    const changePage = (page: number, prevPage: number) => {
      setting.isCheckAll = false;
      setting.isIndeterminate = false;
      if (props.hasCheckbox) {
        checkModel.value = [];
      }
      let order = setting.order;
      let sort = setting.sort;
      let offset = (page - 1) * setting.pageSize;
      let limit = setting.pageSize;

      if (!props.isReSearch || page > 1 || page == prevPage) {
        // 非重新查詢發生的頁碼變動才執行呼叫查詢 (Call query will only be executed if the page number is changed without re-query)
        emit("do-search", offset, limit, order, sort, page);
      }
    };
    // 監聽頁碼切換 (Monitor page switching)
    const stopWatch3 = watch(
      () => setting.page,
      (val: number, old: any) => {
        changePage(val, old);
      },
      { immediate: true }
    );
    // 監聽手動頁碼切換 (Monitor manual page switching)
    const stopWatch4 = watch(
      () => props.page,
      (val) => {
        if (val <= 1) {
          setting.page = 1;
          emit("get-now-page", setting.page);
        } else if (val >= setting.maxPage) {
          setting.page = setting.maxPage;
          emit("get-now-page", setting.page);
        } else {
          setting.page = val;
        }
      }
    );

    /**
     * 切換顯示筆數 (Switch display number)
     */
    const changePageSize = () => {
      if (setting.page === 1) {
        // 沒自動觸發 changePage()，所以手動觸發
        changePage(setting.page, setting.page);
      } else {
        // 強制返回第一頁,並自動觸發 changePage()
        setting.page = 1;
        setting.isCheckAll = false;
        setting.isIndeterminate = false;
      }
    };
    // 監聽組件內顯示筆數切換 (Monitor display number switch from component)
    const stopWatch5 = watch(() => setting.pageSize, changePageSize);
    // 監聽來自Prop的顯示筆數切換 (Monitor display number switch from prop)
    watch(
      () => props.pageSize,
      (newPageSize) => {
        setting.pageSize = newPageSize;
      }
    );
    const stopWatch6 = watch(
      () => props.selectedItems,
      (val: any) => {
        if (Array.isArray(val)) checkModel.value = val;

        if (val?.length === 0) {
          clearChecked(false);
        }
      },
      { immediate: true }
    );

    /**
     * 上一頁 (Previous page)
     */
    const prevPage = () => {
      if (setting.page == 1) {
        // 如果是第一頁，不予執行 (If it is the first page, it will not be executed)
        return false;
      }
      setting.page--;
    };

    /**
     * 移動至指定頁數 (Move to the specified number of pages)
     */
    const movePage = (page: number) => {
      setting.page = page;
    };

    const checkState = (row: any) => {
      for (let i = 0; i < checkModel.value.length; i++) {
        const state = checkModel.value[i];
        const checked = isEqual(row, state);
        if (checked) return true;
      }
      return false;
    };

    /**
     * 下一頁 (Next page)
     */
    const nextPage = () => {
      if (setting.page >= setting.maxPage) {
        // 如果等於大於最大頁數，不與執行 (If it is equal to or greater than the maximum number of pages, no execution)
        return false;
      }
      setting.page++;
    };

    // 監聽資料變更 (Monitoring data changes)
    const stopWatch7 = watch(
      () => props.rows,
      (arr: any[]) => {
        if (props.isReSearch || props.isStaticMode) {
          setting.page = 1;
        }
        nextTick(function () {
          // 資料完成渲染後回傳私有元件 (Return the private components after the data is rendered)
          if (!props.isStaticMode) {
            callIsFinished();
          }
        });
      },
      { deep: true }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stringFormat = (template: string, ...args: any[]) => {
      return template.replace(/{(\d+)}/g, function (match, number) {
        return typeof args[number] != "undefined" ? args[number] : match;
      });
    };

    // Call 「is-finished」 Method
    const callIsFinished = () => {
      if (localTable.value) {
        let localElement = localTable.value.getElementsByClassName("is-rows-el");
        emit("is-finished", localElement);
      }
      emit("get-now-page", setting.page);
    };

    // Toggle button elements
    const toggleButtonRefs = ref<{ [key: string]: HTMLElement }>({});
    // Grouping rows
    const groupingRowsRefs = ref<{ [key: string]: Array<HTMLElement> }>({});
    // Saved toggle status
    const groupingToggleStatus = ref<{ [key: string]: boolean }>({});

    // Data rows for grouping (Default-mode only)
    const groupingRows = computed(() => {
      let result = {} as any;
      props.rows.forEach((v: any) => {
        if (!result[v[props.groupingKey]]) {
          result[v[props.groupingKey]] = [];
        }
        result[v[props.groupingKey]].push(v);
      });

      nextTick(function () {
        if (props.startCollapsed || props.isKeepCollapsed) {
          for (const [groupIndex, el] of Object.entries(toggleButtonRefs.value)) {
            if (el && el.parentElement) {
              let isOpen = !props.startCollapsed;
              if (
                props.isKeepCollapsed &&
                groupingToggleStatus.value[groupIndex] !== undefined
              ) {
                isOpen = !groupingToggleStatus.value[groupIndex];
              }
              if (
                (isOpen && el.parentElement.classList.contains("rotated-90")) ||
                (!isOpen && !el.parentElement.classList.contains("rotated-90"))
              ) {
                el.parentElement.classList.toggle("rotated-90");
              }
              if (!isOpen) {
                groupingRowsRefs.value[groupIndex].forEach((element) => {
                  if (element) {
                    element.classList.add("hidden");
                  }
                });
              }
            }
          }
        }
        callIsFinished();
      });

      return result;
    });

    /**
     * Toggle Group rows
     *
     * @param {String} groupIndex
     */
    const toggleGroup = (groupIndex: string) => {
      let targetEl = toggleButtonRefs.value[groupIndex];
      if (targetEl && targetEl.parentElement) {
        targetEl.parentElement.classList.toggle("rotated-90");
        const isClose = targetEl.parentElement.classList.contains("rotated-90");
        groupingRowsRefs.value[groupIndex].forEach((element) => {
          if (isClose) {
            element.classList.add("hidden");
          } else {
            element.classList.remove("hidden");
          }
        });
        groupingToggleStatus.value[groupIndex] = isClose;
        emit("row-toggled", groupingRows.value[groupIndex], isClose);
      }
    };

    /**
     * Add hover class to tr
     *
     * @param {MouseEvent} mouseEvent
     */
    const addHoverClassToTr = (mouseEvent: MouseEvent) => {
      if (mouseEvent.target instanceof HTMLElement) {
        // mouseEvent.target.classList.add("hover");
        enterRow.value = mouseEvent.target;
      }
    };

    /**
     * Remove hover class from tr
     *
     * @param {MouseEvent} mouseEvent
     */
    const removeHoverClassFromTr = (mouseEvent: MouseEvent) => {
      if (mouseEvent.target instanceof HTMLElement) {
        // mouseEvent.target.classList.remove("hover");
        enterRow.value = null;
      }
    };

    /**
     * Add hover class to td
     *
     * @param {Number} index
     */
    const addVerticalHighlight = (index: number) => {
      if (!setting.isVerticalHighlight) {
        return;
      }
      if (!localTable.value) {
        return;
      }
      let elements = localTable.value.querySelectorAll(".vtl-tbody-td" + index);
      for (let i = 0; i < elements.length; i++) {
        elements[i].classList.add("hover");
      }
    };

    /**
     * Remove hover class from td
     *
     * @param {Number} index
     */
    const removeVerticalHighlight = (index: number) => {
      if (!setting.isVerticalHighlight) {
        return;
      }
      if (!localTable.value) {
        return;
      }
      let elements = localTable.value.querySelectorAll(".vtl-tbody-td" + index);
      for (let i = 0; i < elements.length; i++) {
        elements[i].classList.remove("hover");
      }
    };

    const setMinHeight = () => {
      if (props.rows.length === 0) {
        if (rootTable.value && tableHeader.value) {
          const rect = tableHeader.value.getBoundingClientRect();
          const tableRect = rootTable.value.getBoundingClientRect();
          if (!rect.height || !tableRect.height) return;
          const salt = 15;
          const height = rect.height + salt;
          emptyHeight.value = tableRect.height - height + "px";
        } else {
          if (props.minHeight.includes("px"))
            emptyHeight.value = parseInt(props.minHeight) - 30 + "px";
          else if (props.maxHeight.includes("px"))
            emptyHeight.value = parseInt(props.maxHeight) - 30 + "px";
        }
      } else {
        emptyHeight.value = "0px";
      }
    };

    const heightWatch = watch(
      () => props.rows,
      (val: any) => {
        nextTick(() => {
          setMinHeight();
        });
      },
      {
        immediate: true,
      }
    );
    setMinHeight();
    /**
     * 組件掛載後事件 (Mounted Event)
     */
    onMounted(() => {
      nextTick(() => {
        if (props.rows.length > 0) {
          callIsFinished();
        }

        window.addEventListener("resize", resizeEvent);

        // 필터 레이어 닫기 이벤트
        window.addEventListener("click", closeFilterLayer);

        // col resize
        const table = document.querySelector(`#${props.id}`);
        const root = document.querySelector(`#${props.id}-root`);

        const { width } = root?.getBoundingClientRect() || null;

        if (table) {
          resizerOptions.value = {
            headerOnly: true,
            liveDrag: true,
            resizeMode: "overflow",
            // minWidth: width,
            disabledColumns: props.hasCheckbox ? [0] : [], // 특정 컬럼을 안쓰려면 여기를 수정
            ...props.resizeOptions,
            serialize: false,
            onResize: (evt: any) => {
              resizer.value.tb.columns
                .filter((col: any) => {
                  if (col.getAttribute("class")?.includes("checkbox") === false) {
                    return col;
                  }
                })
                .forEach((col: any, index: number) => {
                  (props.columns[index] as any).width = col.style.width;
                });
              nextTick(() => {
                emit("width-update", props.columns);
              });
            },
          };
          resizer.value = new ColumnResizer(table, resizerOptions.value);
        }
      });
    });

    onUnmounted(() => {
      stopWatch1();
      stopWatch2();
      stopWatch3();
      stopWatch4();
      stopWatch5();
      stopWatch6();
      stopWatch7();
      heightWatch();
      window.removeEventListener("click", closeFilterLayer);
      window.removeEventListener("resize", resizeEvent);
      scrollHandler.value?.stopScroll();
      scrollHandler.value = null;

      resizer.value?.destroy();
    });

    return {
      getColumnLength,
      slots,
      localTable,
      rootTable,
      tableHeader,
      emptyHeight,
      localRows,
      setting,
      rowCheckbox,
      checked,
      clearChecked,
      doSort,
      prevPage,
      movePage,
      nextPage,
      stringFormat,
      toggleButtonRefs,
      groupingRowsRefs,
      groupingRows,
      toggleGroup,
      addHoverClassToTr,
      removeHoverClassFromTr,
      addVerticalHighlight,
      removeVerticalHighlight,
      checkState,
      openLayer,
      searchFilter,
      closeLayer,
      scrollHandler,
      sanitize: DOMPurify.default?.sanitize,
      onRowClicked,
    };
  },
  watch: {
    pageSize() {
      this.setting.pageSize = this.pageSize;
    },
  },
});
</script>

<template>
  <!-- eslint-disable @typescript-eslint/no-explicit-any -->
  <div class="vtl vtl-card" :id="`${id}-root`" ref="rootTable">
    <div class="vtl-card-title" v-if="title" :id="scrollId">{{ title }}</div>
    <div class="vtl-card-body">
      <div class="vtl-row">
        <div
          class="vtl-table-responsive col-sm-12"
          :class="{
            'fixed-first-column': isFixedFirstColumn,
            'fixed-first-second-column': isFixedFirstColumn && hasCheckbox,
          }"
          :style="`min-height: ${minHeight}; max-height: ${maxHeight};`"
        >
          <div v-if="isLoading" class="vtl-loading-mask">
            <div class="vtl-loading-content">
              <span style="color: white">Loading...</span>
            </div>
          </div>
          <table
            :id="id"
            class="vtl-table vtl-table-hover vtl-table-bordered"
            style="width: 100% !important"
            ref="localTable"
          >
            <colgroup>
              <col v-if="hasCheckbox" class="vtl-checkbox-th" />
              <col
                v-for="(col, index) in (columns as Array<any>)"
                :key="`col-${index}`"
                :style="
                  Object.assign(
                    {
                      width: col.width || `auto`,
                      'min-width': col.width < 80 ? `${col.width}px` : '80px',
                    },
                    col.headerStylest
                  )
                "
              />
            </colgroup>
            <thead class="vtl-thead" ref="tableHeader">
              <tr class="vtl-thead-tr">
                <th v-if="hasCheckbox" class="vtl-thead-th vtl-checkbox-th">
                  <div :class="`${checkboxWrapperClass}`">
                    <input
                      :disabled="!multiple"
                      type="checkbox"
                      class="vtl-thead-checkbox form-check-input cursor-pointer"
                      :indeterminate="setting.isIndeterminate"
                      v-model="setting.isCheckAll"
                    />
                  </div>
                </th>
                <th
                  v-for="(col, index) in (columns as Array<any>)"
                  class="vtl-thead-th"
                  :class="col.headerClasses"
                  :key="index"
                >
                  <div class="d-flex align-items-center">
                    <div
                      class="vtl-thead-column"
                      :class="{
                        'vtl-sortable': col.sortable,
                        'vtl-both': col.sortable,
                        'vtl-asc': setting.order === col.field && setting.sort === 'asc',
                        'vtl-desc':
                          setting.order === col.field && setting.sort === 'desc',
                      }"
                      @click.prevent="col.sortable ? doSort(col.field) : false"
                      v-html="sanitize(col.label)"
                    ></div>

                    <div>
                      <i
                        name="filter-icon"
                        class="mdi mdi-filter-outline filter-icon cursor-pointer"
                        @click="openLayer($event, col)"
                        v-if="col.filter"
                      ></i>

                      <transition>
                        <div
                          class="card filter-root"
                          v-if="col.showFilter"
                          id="filterRef"
                        >
                          <div class="card-body">
                            <div
                              class="d-flex align-items-center justify-content-between mb-2"
                            >
                              <div>
                                <span class="fs-14 fw-600">{{ col.label }} 검색</span>
                              </div>
                              <div
                                @click="closeLayer(col)"
                                class="cursor-pointer"
                                name="filter-close"
                              >
                                <i
                                  class="mdi mdi-close close-filter"
                                  name="filter-close-icon"
                                ></i>
                              </div>
                            </div>

                            <div class="d-flex align-items-center">
                              <input
                                type="text"
                                class="form-control"
                                placeholder="검색어 입력"
                                v-model="col.keyword"
                                @keydown.enter="searchFilter(col)"
                              />

                              <button
                                class="btn btn-transparent search-btn mx-2"
                                @click="searchFilter"
                              >
                                <i class="mdi mdi-magnify"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      </transition>
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <template v-if="rows.length > 0">
              <tbody
                v-if="isStaticMode"
                class="vtl-tbody"
                :set="(templateRows = groupingKey == '' ? [localRows] : localRows)"
              >
                <template
                  v-for="(rows, groupingIndex) in templateRows"
                  :key="groupingIndex"
                >
                  <tr v-if="groupingKey != ''" class="vtl-tbody-tr vtl-group-tr">
                    <td
                      :colspan="hasCheckbox ? columns.length + 1 : columns.length"
                      class="vtl-tbody-td vtl-group-td"
                    >
                      <div class="flex">
                        <div v-if="hasGroupToggle" class="animation">
                          <a
                            :ref="(el: any) => (toggleButtonRefs[groupingIndex] as any) = el"
                            class="cursor-pointer"
                            @click.prevent="toggleGroup(groupingIndex.toString())"
                            >▼</a
                          >
                        </div>
                        <div
                          class="ml-2"
                          v-html="
                            groupingDisplay
                              ? sanitize(groupingDisplay(groupingIndex))
                              : sanitize(groupingIndex)
                          "
                        ></div>
                      </div>
                    </td>
                  </tr>
                  <tr
                    v-for="(row, i) in rows"
                    :key="row[setting.keyColumn] ? row[setting.keyColumn] : i"
                    :ref="
                      (el: any) => {
                        if (!groupingRowsRefs[groupingIndex]) {
                          groupingRowsRefs[groupingIndex] = [];
                        }
                        groupingRowsRefs[groupingIndex][i] = el;
                      }
                    "
                    :name="'vtl-group-' + groupingIndex"
                    class="vtl-tbody-tr"
                    :class="
                      typeof rowClasses === 'function' ? rowClasses(row) : rowClasses
                    "
                    @mouseenter="addHoverClassToTr"
                    @mouseleave="removeHoverClassFromTr"
                    @click="onRowClicked($event, row)"
                  >
                    <td v-if="hasCheckbox" class="vtl-tbody-td">
                      <div :class="`${checkboxWrapperClass}`">
                        <input
                          type="checkbox"
                          class="vtl-tbody-checkbox form-check-input cursor-pointer"
                          :ref="
                            (el: any) => {
                              (rowCheckbox as Array<HTMLElement>).push(el);
                            }
                          "
                          :value="row[setting.keyColumn]"
                          :disabled="row.disabled"
                          :checked="checkState(row)"
                          @click="checked(row, $event)"
                        />
                      </div>
                    </td>
                    <td
                      v-for="(col, j) in (columns as Array<any>)"
                      :key="j"
                      class="vtl-tbody-td"
                      :class="['vtl-tbody-td' + j].concat(col.columnClasses)"
                      :style="col.columnStyles"
                      @mouseover="addVerticalHighlight(j)"
                      @mouseleave="removeVerticalHighlight(j)"
                    >
                      <div v-if="col.display" v-html="sanitize(col.display(row))"></div>
                      <div v-else>
                        <div v-if="setting.isSlotMode && slots[col.field]">
                          <slot :name="col.field" :value="row"></slot>
                        </div>
                        <span v-else>{{ row[col.field] }}</span>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
              <tbody
                v-else
                :set="(templateRows = groupingKey == '' ? [rows] : groupingRows)"
              >
                <template
                  v-for="(rows, groupingIndex) in templateRows"
                  :key="groupingIndex"
                >
                  <tr v-if="groupingKey != ''" class="vtl-tbody-tr vtl-group-tr">
                    <td
                      :colspan="hasCheckbox ? columns.length + 1 : columns.length"
                      class="vtl-tbody-td vtl-group-td"
                    >
                      <div class="flex">
                        <div v-if="hasGroupToggle" class="animation">
                          <a
                            :ref="(el: any) => (toggleButtonRefs[groupingIndex] as any) = el"
                            class="cursor-pointer"
                            @click.prevent="toggleGroup(groupingIndex.toString())"
                            >▼</a
                          >
                        </div>
                        <div
                          class="ml-2"
                          v-html="
                            groupingDisplay
                              ? sanitize(groupingDisplay(groupingIndex))
                              : sanitize(groupingIndex)
                          "
                        ></div>
                      </div>
                    </td>
                  </tr>
                  <tr
                    v-for="(row, i) in rows"
                    :ref="
                      (el: any) => {
                        if (!groupingRowsRefs[groupingIndex]) {
                          groupingRowsRefs[groupingIndex] = [];
                        }
                        groupingRowsRefs[groupingIndex][i] = el;
                      }
                    "
                    :name="'vtl-group-' + groupingIndex"
                    :key="row[setting.keyColumn] ? row[setting.keyColumn] : i"
                    class="vtl-tbody-tr"
                    :class="
                      typeof rowClasses === 'function' ? rowClasses(row) : rowClasses
                    "
                    @mouseenter="addHoverClassToTr"
                    @mouseleave="removeHoverClassFromTr"
                    @click="onRowClicked($event, row)"
                  >
                    <td v-if="hasCheckbox" class="vtl-tbody-td">
                      <div :class="`${checkboxWrapperClass}`">
                        <input
                          type="checkbox"
                          class="vtl-tbody-checkbox form-check-input cursor-pointer"
                          :ref="(el: any) => (rowCheckbox as Array<HTMLElement>).push(el)"
                          :value="row[setting.keyColumn]"
                          :disabled="row.disabled"
                          :checked="checkState(row)"
                          @click="checked(row, $event)"
                        />
                      </div>
                    </td>
                    <td
                      v-for="(col, j) in (columns as Array<any>)"
                      :key="j"
                      class="vtl-tbody-td"
                      :class="['vtl-tbody-td' + j].concat(col.columnClasses)"
                      :style="col.columnStyles"
                      @mouseover="addVerticalHighlight(j)"
                      @mouseleave="removeVerticalHighlight(j)"
                    >
                      <div v-if="col.display" v-html="sanitize(col.display(row))"></div>
                      <div v-else>
                        <div v-if="setting.isSlotMode && slots[col.field]">
                          <slot :name="col.field" :value="row"></slot>
                        </div>
                        <span v-else>{{ row[col.field] }}</span>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </template>

            <template v-else>
              <tbody>
                <tr>
                  <td :colspan="getColumnLength()" :style="`height: ${emptyHeight};`">
                    <div class="vtl-empty-msg col-sm-12 text-center">
                      {{ messages.noDataAvailable }}
                    </div>
                  </td>
                </tr>
              </tbody>
            </template>
          </table>
        </div>
      </div>
      <div
        class="vtl-paging vtl-row d-flex justify-content-end align-items-center"
        :class="{ 'display-none': setting.isHidePaging }"
        v-if="rows.length > 0"
      >
        <template v-if="!setting.isHidePaging">
          <!-- <div class="vtl-paging-info col-sm-12 col-md-4">
            <div role="status" aria-live="polite">
              {{
                stringFormat(messages.pagingInfo, setting.offset, setting.limit, total)
              }}
            </div>
          </div> -->

          <div
            class="vtl-paging-pagination-div col-sm-12 col-md-12 d-flex align-items-center"
            :class="{
              'justify-content-between': scrollId,
              'justify-content-end': !scrollId,
            }"
          >
            <div class="d-flex justify-content-start my-2 mx-2" v-if="scrollUse">
              <button
                class="btn btn-normal scroll-btn"
                @mouseenter="scrollHandler.scrollLeftSide"
                @mouseleave="scrollHandler.stopScroll"
              >
                <i class="mdi mdi-chevron-left"></i>
              </button>
              <button
                class="btn btn-normal scroll-btn me-2"
                @mouseenter="scrollHandler.scrollRightSide"
                @mouseleave="scrollHandler.stopScroll"
              >
                <i class="mdi mdi-chevron-right"></i>
              </button>
            </div>
            <div v-else></div>

            <div class="d-flex align-items-center">
              <div class="vtl-paging-change-div mx-4 d-flex">
                <span class="vtl-paging-count-label">{{
                  messages.pageSizeChangeLabel
                }}</span>
                <select class="vtl-paging-count-dropdown" v-model="setting.pageSize">
                  <option
                    v-for="pageOption in (pageOptions as Array<pageOption>)"
                    :value="pageOption.value"
                    :key="pageOption.value"
                  >
                    {{ pageOption.text }}
                  </option>
                </select>
                <span class="vtl-paging-page-label">{{ messages.gotoPageLabel }}</span>
                <select class="vtl-paging-page-dropdown" v-model="setting.page">
                  <option
                    v-for="n in setting.maxPage"
                    :key="n"
                    :value="parseInt(n.toString())"
                  >
                    {{ n }}
                  </option>
                </select>
              </div>

              <div class="dataTables_paginate">
                <ul class="vtl-paging-pagination-ul vtl-pagination">
                  <li
                    :disable="setting.page <= 1"
                    class="vtl-paging-pagination-page-li vtl-paging-pagination-page-li-first page-item"
                    :class="{ disabled: setting.page <= 1 }"
                  >
                    <a
                      class="vtl-paging-pagination-page-link vtl-paging-pagination-page-link-first page-link cursor-pointer"
                      aria-label="Previous"
                      @click.prevent="setting.page = 1"
                    >
                      <span aria-hidden="true"
                        ><i class="mdi mdi-chevron-double-left"></i
                      ></span>
                      <span class="sr-only">First</span>
                    </a>
                  </li>
                  <li
                    :disable="setting.page <= 1"
                    class="vtl-paging-pagination-page-li vtl-paging-pagination-page-li-prev page-item"
                    :class="{ disabled: setting.page <= 1 }"
                  >
                    <a
                      class="vtl-paging-pagination-page-link vtl-paging-pagination-page-link-prev page-link cursor-pointer"
                      aria-label="Previous"
                      @click.prevent="prevPage"
                    >
                      <span aria-hidden="true"><i class="mdi mdi-chevron-left"></i></span>
                      <span class="sr-only">Prev</span>
                    </a>
                  </li>
                  <li
                    class="vtl-paging-pagination-page-li vtl-paging-pagination-page-li-number page-item"
                    v-for="n in setting.paging"
                    :key="n"
                    :class="{
                      disabled: setting.page === n,
                      activated: setting.page === n,
                    }"
                  >
                    <a
                      class="vtl-paging-pagination-page-link vtl-paging-pagination-page-link-number page-link cursor-pointer"
                      @click.prevent="movePage(n)"
                      >{{ n }}</a
                    >
                  </li>
                  <li
                    :disable="setting.page >= setting.maxPage"
                    class="vtl-paging-pagination-page-li vtl-paging-pagination-page-li-next page-item"
                    :class="{ disabled: setting.page >= setting.maxPage }"
                  >
                    <a
                      class="vtl-paging-pagination-page-link vtl-paging-pagination-page-link-next page-link cursor-pointer"
                      aria-label="Next"
                      @click.prevent="nextPage"
                    >
                      <span aria-hidden="true"
                        ><i class="mdi mdi-chevron-right"></i
                      ></span>
                      <span class="sr-only">Next</span>
                    </a>
                  </li>
                  <li
                    :disable="setting.page >= setting.maxPage"
                    class="vtl-paging-pagination-page-li vtl-paging-pagination-page-li-last page-item"
                    :class="{ disabled: setting.page >= setting.maxPage }"
                  >
                    <a
                      class="vtl-paging-pagination-page-link vtl-paging-pagination-page-link-last page-link cursor-pointer"
                      aria-label="Next"
                      @click.prevent="setting.page = setting.maxPage"
                    >
                      <span aria-hidden="true"
                        ><i class="mdi mdi-chevron-double-right"></i
                      ></span>
                      <span class="sr-only">Last</span>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </template>
      </div>
      <!-- <div class="vtl-row" ref="emptyArea" v-else>
        <div class="vtl-empty-msg col-sm-12 text-center">
          {{ messages.noDataAvailable }}
        </div>
      </div> -->
    </div>
  </div>
  <!-- eslint-disable @typescript-eslint/no-explicit-any -->
</template>

<style scoped>
.display-none {
  display: none !important;
}
.vtl-checkbox-th {
  width: 1%;
  min-width: 38px;
}
.vtl-checkbox-td {
  width: 1%;
  min-width: 38px;
}

.vtl-both {
  background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAATCAQAAADYWf5HAAAAkElEQVQoz7X QMQ5AQBCF4dWQSJxC5wwax1Cq1e7BAdxD5SL+Tq/QCM1oNiJidwox0355mXnG/DrEtIQ6azioNZQxI0ykPhTQIwhCR+BmBYtlK7kLJYwWCcJA9M4qdrZrd8pPjZWPtOqdRQy320YSV17OatFC4euts6z39GYMKRPCTKY9UnPQ6P+GtMRfGtPnBCiqhAeJPmkqAAAAAElFTkSuQmCC");
}

.vtl-sortable {
  cursor: pointer;
  background-position: right;
  background-repeat: no-repeat;
  padding-right: 18px !important;
}

.vtl-asc {
  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAATCAYAAAByUDbMAAAAZ0lEQVQ4y2NgGLKgquEuFxBPAGI2ahhWCsS/gDibUoO0gPgxEP8H4ttArEyuQYxAPBdqEAxPBImTY5gjEL9DM+wTENuQahAvEO9DMwiGdwAxOymGJQLxTyD+jgWDxCMZRsEoGAVoAADeemwtPcZI2wAAAABJRU5ErkJggg==);
}

.vtl-desc {
  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAATCAYAAAByUDbMAAAAZUlEQVQ4y2NgGAWjYBSggaqGu5FA/BOIv2PBIPFEUgxjB+IdQPwfC94HxLykus4GiD+hGfQOiB3J8SojEE9EM2wuSJzcsFMG4ttQgx4DsRalkZENxL+AuJQaMcsGxBOAmGvopk8AVz1sLZgg0bsAAAAASUVORK5CYII=);
}

.vtl-loading-mask {
  position: absolute;
  z-index: 3;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-flow: column;
  transition: opacity 0.3s ease;
}

.vtl-loading-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vtl-card {
  position: relative;
  display: -ms-flexbox;
  display: flex;
  -ms-flex-direction: column;
  flex-direction: column;
  min-width: 0;
  word-wrap: break-word;
  background-color: #fff;
  background-clip: border-box;
  border: none;
}

select {
  width: auto;
  border: 1px solid #cccccc;
  background-color: #ffffff;
  height: auto;
  padding: 0;
  margin-bottom: 0;
}

table {
  display: table;
}

.vtl {
  background-color: inherit;
}

.vtl-table {
  width: 100% !important;
  /* margin-bottom: 1rem; */
  color: #212529;
  border-collapse: collapse;
}

th {
  text-align: inherit;
  white-space: nowrap;
}

tr {
  display: table-row;
  vertical-align: inherit;
  border-color: inherit;
}

/* .vtl-table-bordered thead td,
.vtl-table-bordered thead th {
  border-bottom-width: 2px;
} */

.vtl-table thead th {
  vertical-align: bottom;
  color: #fff;
  background-color: #343a40;
  border-color: #454d55;
  border-bottom: 2px solid #dee2e6;
}

.vtl-table-bordered td,
.vtl-table-bordered th {
  border: 1px solid #dee2e6;
  border-top: 0px;
}

.vtl-table-bordered th:first-child {
  border-left: 0px;
}

.vtl-table-bordered th:last-child {
  border-right: 0px;
}

.vtl-table td,
.vtl-table th {
  padding: 4px 11px !important;
  vertical-align: top;
  /* border-top: 1px solid #dee2e6; */
  vertical-align: middle;
}

/* .vtl-table-hover tbody tr:hover {
  color: #212529;
  background-color: #ececec;
} */

.vtl-table-responsive {
  display: block;
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.vtl-table-responsive > .vtl-table-bordered {
  border: 0;
}

.vtl-row {
  display: -ms-flexbox;
  display: flex;
  -ms-flex-wrap: wrap;
  flex-wrap: wrap;
}

.vtl-pagination {
  margin: 2px 0;
  white-space: nowrap;
  justify-content: flex-end;
  display: -ms-flexbox;
  display: flex;
  padding-left: 0;
  list-style: none;
  border-radius: 0.25rem;
}

.page-item.disabled .page-link {
  color: #6c757d;
  pointer-events: none;
  cursor: auto;
  background-color: #fff;
  border-color: #dee2e6;
}

.page-item:first-child .page-link {
  margin-left: 0;
  border-top-left-radius: 0.25rem;
  border-bottom-left-radius: 0.25rem;
}

.page-link {
  position: relative;
  display: block;
  padding: 0.5rem 0.75rem;
  margin-left: -1px;
  line-height: 1.25;
  color: #007bff;
  background-color: #fff;
  border: 1px solid #dee2e6;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

*,
::after,
::before {
  box-sizing: border-box;
}

.col-sm-12 {
  -ms-flex: 0 0 100%;
  flex: 0 0 100%;
  max-width: 100%;
}

.text-center {
  text-align: center;
}

@media (min-width: 576px) {
  .vtl-table-responsive-sm {
    display: block;
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .vtl-table-responsive-sm > .table-bordered {
    border: 0;
  }
  .col-md-4 {
    -ms-flex: 0 0 33.333333%;
    flex: 0 0 33.333333%;
    max-width: 33.333333%;
  }
}

.vtl-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
}
.vtl-table tbody th {
  position: sticky;
  left: 0;
  z-index: 1;
}

.fixed-first-column {
  overflow-x: auto;
}
.fixed-first-column tr th:first-child {
  position: sticky;
  left: 0;
  z-index: 2;
}
.fixed-first-column tr td:first-child {
  position: sticky;
  left: 0;
}

.fixed-first-column tr th:first-child::before,
.fixed-first-second-column tr th:nth-child(2)::before {
  content: "";
  position: absolute;
  border-right: 1px solid #454d55;
  left: 0;
  top: 0;
  width: 102%;
  height: 102%;
}
.fixed-first-column tr .vtl-checkbox-th:first-child::before {
  content: "";
  position: absolute;
  border-right: 1px solid #454d55;
  left: 0;
  top: 0;
  width: 103%;
  height: 102%;
}
.fixed-first-column tr td:first-child::before,
.fixed-first-column tr td:nth-child(2)::before {
  content: "";
  position: absolute;
  border-right: 1px solid #dee2e6;
  left: 0;
  top: 0;
  width: 102%;
  height: 102%;
}
.fixed-first-column tr .vtl-checkbox-td:first-child::before {
  content: "";
  position: absolute;
  border-right: 1px solid #dee2e6;
  left: 0;
  top: 0;
  width: 103%;
  height: 102%;
}

.fixed-first-second-column tr th:nth-child(2),
.fixed-first-second-column tr td:nth-child(2) {
  position: sticky;
  left: 38px;
}

.fixed-first-second-column tr th:nth-child(2) {
  z-index: 2;
}

.fixed-first-column tr td:first-child,
.fixed-first-second-column tr td:nth-child(2) {
  background-color: white;
}

.fixed-first-column tr.hover td:first-child,
.fixed-first-second-column tr.hover td:nth-child(2) {
  background-color: #ececec;
}

.flex {
  display: flex;
}
.animation {
  transform: rotate(0deg);
  transition: transform 0.3s;
}
.cursor-pointer {
  cursor: pointer;
}
.rotated-90 {
  transform: rotate(-90deg);
}
.hidden {
  display: none;
}
.ml-2 {
  margin-left: 0.5rem;
}
.vtl-tbody-td.hover {
  background-color: #ececec;
}
.form-check {
  padding-left: 0px;
  margin-bottom: 0px;
}

.form-check .form-check-input {
  margin-left: 0em;
}
.activated {
  font-weight: 700;
}
.filter-icon {
  font-size: 15px;
}
.filter-root {
  transform: translate(0px, 10px);
  position: fixed;
  z-index: 10;

  .search-btn {
    position: absolute;
    right: 10px;
  }
  .search-btn:hover,
  .search-btn:active,
  .search-btn:focus-visible {
    color: #212529;
  }
}
.w-100 {
  width: 100% !important;
}
.scroll-btn {
  padding: 0.3rem 0.45rem;
}
.dataTables_paginate {
  margin-right: 0.5rem;
}
.grip-handle .grip-resizable {
  width: 2px;
}
</style>
