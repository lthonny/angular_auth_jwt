import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {MatDialog} from "@angular/material/dialog";
import {CdkDragDrop, moveItemInArray, transferArrayItem} from "@angular/cdk/drag-drop";

import {TaskService} from "../../services/task.service";
import {BoardService} from "../../../board/services/board.service";
import {ArchiveService} from "../../services/archive.service";
import {AuthService} from "../../../auth/services/auth.service";
import {AssignedService} from "../../services/assigned.service";

import {
  IArchive,
  IColumn,
  ICreateTask, IInvitedUser,
  IInviteKey,
  ITask
} from "../../../../interfaces";

import {TaskDescriptionComponent} from "../task/task-description.component";
import {IColumns, IDialogData} from "../../interfaces/dashboard.interfaces";
import {ApiDataService} from "../../../board/services/api.data.service";
import {Board} from "../models/board.model";
import {Column} from "../models/column.model";

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.scss']
})
export class DashboardPageComponent implements OnInit {
  public _owner: boolean = true;
  private _boardId = this.boardDataService._boardId;
  public _boardName!: string;

  public link: string = '';

  public invite: boolean = true;
  public submitted: boolean = true;
  public searchTask: string = '';

  public _users: IInvitedUser[] = [];

  public taskListToDo: ITask[] = [];
  public taskListInProgress: ITask[] = [];
  public taskListCoded: ITask[] = [];
  public taskListTesting: ITask[] = [];
  public taskListDone: ITask[] = [];

  public taskLists = [this.taskListToDo, this.taskListInProgress, this.taskListCoded, this.taskListTesting, this.taskListDone];

  board: Board = new Board('tasks', [
    new Column(IColumns[0], this.taskListToDo),
    new Column(IColumns[1], this.taskListInProgress),
    new Column(IColumns[2], this.taskListCoded),
    new Column(IColumns[3], this.taskListTesting),
    new Column(IColumns[4], this.taskListDone)
  ]);

  form: FormGroup = new FormGroup({
    name: new FormControl(null, [
      Validators.required
    ]),
    description: new FormControl(null, [
      Validators.required
    ])
  });

  constructor(
    public authService: AuthService,
    public boardService: BoardService,
    public boardDataService: ApiDataService,
    public archiveService: ArchiveService,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private tasksService: TaskService,
    public assignedService: AssignedService,
    private router: Router
  ) {
    console.log(this.board)
  }

  ngOnInit(): void {
    this.getBoardData();
  }

  public getBoardData() {
    this.route.params.subscribe(params => this._boardId = params['id']);
    // this.boardDataService.getBoardData(this._boardId);

    this.boardService.getTasksBoard$(this._boardId).subscribe((data) => {
      this._owner = data.owner;
      this._boardName = data.title;
      this._users = data.users;

      if (data.tasks) {
        this.boardDataService.sortTasks(data.tasks);

        data.tasks.forEach((task: ITask) => {
          if (task.nameTaskList === IColumns[0] && task.archive !== true) {
            this.taskListToDo.push(task);
          }
          if (task.nameTaskList === IColumns[1] && task.archive !== true) {
            this.taskListInProgress.push(task);
          }
          if (task.nameTaskList === IColumns[2] && task.archive !== true) {
            this.taskListCoded.push(task);
          }
          if (task.nameTaskList === IColumns[3] && task.archive !== true) {
            this.taskListTesting.push(task);
          }
          if (task.nameTaskList === IColumns[4] && task.archive !== true) {
            this.taskListDone.push(task);
          }
        })
      }
    })
  }

  public openDialog(item: ITask): void {
    const dialogRef = this.dialog.open(TaskDescriptionComponent, {
      data: {item, ownerStatus: this._owner, board: this._boardId, invited: this._users},
      height: '700px',
      width: '600px',
    });

    dialogRef.afterClosed().subscribe((result: IDialogData) => {
      if (result) {
        // this.boardDataService.getDialogRef(result);
        this.taskLists.forEach((column: ITask[], i: number) => {
          if (result.item.nameTaskList === IColumns[i]) {
            const index = column.findIndex((task: ITask) => task.id === result.item.id);
            if (index !== -1) {
              column.splice(index, 1);
              this.archiveService.archivedTasks.push(result.item);
            }
          }
        })
      }
    });
  }

  public drop(event: CdkDragDrop<ITask[]>, column: IColumn): void {
    if (this._owner) {
      const nameColumn = column.name;

      if (event.previousContainer === event.container) {
        moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      } else {
        transferArrayItem(
          event.previousContainer.data,
          event.container.data,
          event.previousIndex,
          event.currentIndex
        );
        event.previousContainer.data.forEach((x: ITask, index) => {
          x.order = index;
        });
      }

      event.container.data.forEach((x: ITask, index) => {
        x.order = index;
      })

      // this.boardDataService.sortTasks(event.container.data);
      this.tasksService.updateOrderTask$(event.container.data).subscribe((data) => {
      })

      if (event.container.data.length >= 0) {
        let newTaskList: ITask[] = [];

        event.container.data.forEach((task: ITask) => {
          newTaskList.push(task);

          if (task.nameTaskList !== nameColumn || task.order !== undefined) {
            this.tasksService.updateNameColumnTask$(task.id, task.order, nameColumn).subscribe((data) => {
              // console.log(data);
            });
          }
          return;
        })
      }
    }
  }

  // сделать проще
  public updateTitleBoard(): void {
    // this.boardDataService.updateTitleBoard(this._boardId, this._boardName);

    const titleBoard = document.querySelector('.title-board');
    //  && this._owner
    if (titleBoard !== null) {
      const childNode = titleBoard.firstChild;

      if (childNode !== null) {
        titleBoard.removeChild(childNode);
        const input = document.createElement('input');
        input.value = this._boardName;
        titleBoard.append(input);

        input.focus();

        input.addEventListener('blur', () => {
          titleBoard.innerHTML = input.value;
          this._boardName = input.value;

          this.boardService.updateBoard$(
            this._boardId,
            this._boardName
          ).subscribe(({id, title, owner}) => {
            this._owner = owner;
            this._boardName = title;
          });
        });

        input.addEventListener('keydown', (event: KeyboardEvent) => {
          if (event.keyCode === 13) {
            titleBoard.innerHTML = input.value;
            this._boardName = input.value;

            this.boardService.updateBoard$(
              this._boardId,
              this._boardName)
              .subscribe(({id, title, owner}) => {
                if (title !== this._boardName) {
                  this._owner = owner;
                  this._boardName = title;
                } else {
                  this._owner = owner;
                }
              });
          }
        });
      }
    }
  }

  public openFullMenu(): void {
    // this.boardDataService.getDataFullMenu(this._boardId);
    this.archiveService.getArchivedTasks$(this._boardId).subscribe((data: ITask[]) => {
      this.archiveService.archivedTasks = [];
      data?.forEach((task) => this.archiveService.archivedTasks.push(task));
    })
  }

  public unzip(task: ITask): void {
    // this.boardDataService.unzip(task);
    this.archiveService.archiveTask$(task.id, task.archive, task.board_id)
      .subscribe(() => {
        for (let i = 0; i < this.board.columns.length; i++) {
          if (this.board.columns[i].name === task.nameTaskList) {
            this.board.columns[i].tasks.push(task);
          }
        }
        this.archiveService.archivedTasks = this.archiveService.archivedTasks.filter((data: IArchive) => data.id !== task.id);
      })
  }

  public getInvitationLink(): void {
    this.invite = false;
    this.boardService.getInviteKey$(this._boardId)
      .subscribe((key: IInviteKey) => this.link = `http://localhost:4200/admin/invite/${this._boardId}/${key.key}`);
  }

  public onClose(): void {
    this.submitted = true;
    this.form.reset();
  }

  public deleteTask(id: number, name: string): void {
    // this.boardDataService.deleteTask(id, name);
    if (this._owner) {
      this.tasksService.deleteTask$(id).subscribe((data) => {
        this.boardDataService.ColumnsType.forEach((taskName: string, i: number) => {
          if (taskName === name) {
            this.taskLists[i] = this.taskLists[i].filter((task: ITask) => task.id !== id);
            this.board.columns[i].tasks = this.taskLists[i].filter((task: ITask) => task.id !== id);
          }
        });
      })
    }
  }

  public deleteColumnTasks(columnName: string): void {
    // this.boardDataService.deleteColumnTasks(this._boardId, columnName);
    if (columnName) {
      this.boardService.deleteTasksColumn$(this._boardId, columnName)
        .subscribe((data) => {
          this.boardDataService.ColumnsType.forEach((allNameTaskList: string, i: number) => {
            if (columnName === allNameTaskList && 'all tasks in this column have been deleted') {
              this.taskLists[i].length = 0;
            }
          })
        })
    }
  }

  public deleteAccessUser(user_id: number): void {
    this.boardDataService.deleteAccessUser(this._boardId, user_id);
    this._users = this._users.filter((data) => data.id !== user_id);
  }

  public leaveBoard(): void {
    this.boardDataService.leaveBoard(this._boardId);
    this.router.navigate(['/admin', 'boards']);
  }

  public submit(nameTaskList: string): void {
    if (this._owner) {
      let order: number = 1;
      let orderSum = undefined;

      // this.boardDataService.taskLists.forEach((column: ITask[], i: number) => {
      //   if (nameTaskList === IColumns[i]) {
      //     orderSum = column.length;
      //   }
      // })


      this.taskLists.forEach((column: ITask[], i: number) => {
        if (nameTaskList === IColumns[i]) {
          orderSum = column.length;
        }
      })

      if (orderSum) {
        order = orderSum + 1;
      }

      if (
        this.form.value.name !== null &&
        this.form.value.description !== null
      ) {
        const task: ICreateTask = {
          title: this.form.value.name,
          description: this.form.value.description,
          nameTaskList: nameTaskList,
          board_id: this._boardId,
          order: order
        }

        // this.boardDataService.createTask(task);
        this.tasksService.createTask$(task).subscribe((task: ITask) => {
          this.taskLists.forEach((column: ITask[], i: number) => {
            if (task.nameTaskList === IColumns[i]) {
              column.push(task);
            }
          })
        })

        this.form.reset();
      } else {
        // ОБРАБОТАТЬ ОШИБКУ ПУСТОГО ПОЛЯ
        console.log('this field must not be empty');
      }
    }
  }
}